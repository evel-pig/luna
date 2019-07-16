import { createAction } from 'redux-actions';
import { call, put, take, fork } from 'redux-saga/effects';
import xFetch from './enhanceFetch';
import { ActionsType, BaseActionTypeConfigs } from './util';
import normalActions from './normalActions';
import { ApiPath, ApiDataMode, getApiOptions, getApiPath, ApiSuccessMessage } from './apiHelper';
export { setMessageObj } from './apiHelper';

export interface Redirect {
  componentName: string;
  message?: string;
}

export type AutoLoading = boolean | string;

export type ShowLoading = boolean | string;

export interface ApiConfig {
  /**
   * path (also use as action name)
   */
  path: ApiPath;
  /**
   * http method (default: GET)
   */
  method?: string;
  /**
   * Determine whether show message when request success
   */
  message?: ApiSuccessMessage;
  /**
   * Determine whether redirect other route when request success
   */
  redirect?: Redirect;
  /**
   * Determine whether custom saga.
   */
  customSaga?: boolean;
  /**
   * custom model name
   */
  modelName?: string;
  /**
   * 允许并发请求
   */
  noBlock?: boolean;
  /**
   * 强制指定请求参数的位置
   */
  dataMode?: ApiDataMode;
  /**
   * 指定basePath，覆盖全局的basePath
   */
  basePath?: ApiPath;

  /**
   * api请求自动改变loading状态，默认为 false
   */
  autoLoading?: AutoLoading;
  /**
   * api请求时是否显示loading组件，默认为false
   */
  showLoading?: ShowLoading;
}

export type ApiActionConfigs<T = any> = BaseActionTypeConfigs<T, ApiConfig>;

export interface ApiActionNames {
  request: string;
  success: string;
  error: string;
}

export type ApiActionNamesType<T = any> = { [key in keyof T]: ApiActionNames };

export interface Api<T> {
  apiActionNames: ApiActionNamesType<T>;
  apiActions: ActionsType<T>;
  sagas: any[];
}

const START_LOADING_SUFFIX = '-startLoading';
const END_LOADING_SUFFIX = '-endLoading';

export const LOADING_SUFFIX = {
  start: START_LOADING_SUFFIX,
  end: END_LOADING_SUFFIX,
};

export const isLoadingAction = {
  start: (action) => {
    return new RegExp(`${START_LOADING_SUFFIX}$`).test(action.type);
  },
  end: (action) => {
    return new RegExp(`${END_LOADING_SUFFIX}$`).test(action.type);
  },
};

export function getAutoLoadingActionNames(modelName) {
  return {
    start: `${modelName}${START_LOADING_SUFFIX}`,
    end: `${modelName}${END_LOADING_SUFFIX}`,
  };
}

export const API_REQUEST_COMPLETE_ACTIONNAME = 'API_REQUEST_COMPLETE';

export interface ApiGlobalConfig {
  basePath: ApiPath;
  autoLoading?: () => AutoLoading;
}

export function initApi<T extends ApiActionConfigs<T>>(
  globalConfig: ApiGlobalConfig, configs: T, modelName: string): Api<T> {
  function makeEffect(api: ApiConfig, request: any, actionNames: ApiActionNames) {
    return function* (req) {
      const payload = req.payload || {};
      const { except, ...others } = payload;
      try {
        const response = yield call(request, others);
        yield call(checkLoading, api, 'end');
        yield put(createAction<any>(API_REQUEST_COMPLETE_ACTIONNAME)({
          actionNames: actionNames,
          req: payload,
          res: response,
          apiConfig: api,
        }));
        return response;
      } catch (error) {
        console.error(`request ${getApiPath(api.path)} 错误`);
        console.error(`request params`, req.payload);
        console.error(`message`, error);
        yield call(checkLoading, api, 'end');
        yield put(createAction<any>(API_REQUEST_COMPLETE_ACTIONNAME)({
          actionNames: actionNames,
          req: payload,
          error: error,
          except: Object.assign({}, except),
        }));
      }
    };
  }

  function* checkLoading(api: ApiConfig, loadingType: 'start' | 'end') {
    let autoLoading: AutoLoading = false;
    if (globalConfig.autoLoading) {
      autoLoading = globalConfig.autoLoading();
    }
    if (api.autoLoading !== null && typeof api.autoLoading !== 'undefined') {
      autoLoading = api.autoLoading;
    }
    if (autoLoading || api.showLoading) {
      yield put({
        type: getAutoLoadingActionNames(modelName)[loadingType],
        payload: {
          autoLoading: typeof autoLoading === 'string' ? autoLoading : 'loading',
          showLoading: api.showLoading,
        },
      });
    }
  }

  function simple(api: ApiConfig, actionNames: ApiActionNames, apiSaga: any, noBlock: boolean = false) {
    if (noBlock) {
      return [
        function* () {
          while (true) {
            const req = yield take(actionNames.request);
            yield call(checkLoading, api, 'start');
            yield fork(apiSaga, req);
          }
        },
      ];
    } else {
      return [function* () {
        while (true) {
          const req = yield take(actionNames.request);
          yield call(checkLoading, api, 'start');
          yield call(apiSaga, req);
        }
      }];
    }
  }

  let apiActionNames = {} as any;
  let apiActions = {} as any;
  let sagas = [];
  Object.keys(configs).forEach(key => {
    let config = configs[key];
    const truePath = key;
    let finalModelName = config.modelName || modelName;
    let actionNames = makeActionNames(finalModelName, config, key);
    apiActionNames[truePath] = actionNames;
    apiActions[truePath] = createAction(actionNames.request);
    let request = makeRequest(globalConfig.basePath, config);
    let effect = makeEffect(config, request, actionNames);
    if (config.customSaga) {
      return;
    }
    sagas.push(...simple(config, apiActionNames[truePath], effect, config.noBlock));
  });

  return {
    apiActionNames,
    apiActions,
    sagas,
  };
}

function getMethod(api: ApiConfig) {
  // 默认method是POST
  let method = 'POST';
  if (api.method) {
    method = api.method.toUpperCase();
  }

  return method;
}

function makeRequest(basePath: ApiPath, api: ApiConfig) {
  return async (data) => {
    const { uri, opts } = getApiOptions({
      path: api.path,
      basePath: api.basePath || basePath,
      method: api.method,
      dataMode: api.dataMode,
      data: data,
    });
    return await xFetch(uri, opts);
  };
}

function makeActionNames(modelName: string, api: ApiConfig, actionName): ApiActionNames {
  const baseActionName = `api-${modelName}-${getMethod(api)}-${actionName}`;
  return {
    request: `${baseActionName}_request`,
    success: `${baseActionName}_success`,
    error: `${baseActionName}_error`,
  };
}

export function createRequestCompleteSaga(errorHandle, processRes) {
  return function* () {
    while (true) {
      const r = yield take(API_REQUEST_COMPLETE_ACTIONNAME);
      const error = errorHandle(r);
      if (error) {
        yield put(createAction<any>(r.payload.actionNames.error)({
          req: r.payload.req,
          error: error,
          except: r.payload.except,
        }));
      } else {
        yield put(createAction<any>(r.payload.actionNames.success)({
          req: r.payload.req,
          res: processRes(r.payload.res),
        }));
        const apiConfig = r.payload.apiConfig as ApiConfig;
        yield put(normalActions.apiComplete({
          redirect: apiConfig.redirect,
          message: apiConfig.message,
        }));
      }
    }
  };
}

export const apiReg = {
  api: /^api-/,
  request: /_request$/,
  error: /_error$/,
  success: /_success$/,
};

function isRequestSuccessAction(action) {
  return apiReg.api.test(action.type) && apiReg.success.test(action.type);
}

function isRequestErrorAction(action) {
  return apiReg.api.test(action.type) && apiReg.error.test(action.type);
}

export const isApiAction = {
  isErrorAction: isRequestErrorAction,
  isSuccessAction: isRequestSuccessAction,
};
