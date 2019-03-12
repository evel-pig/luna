import { createAction } from 'redux-actions';
import { call, put, take, fork } from 'redux-saga/effects';
import xFetch from './enhanceFetch';
import { getQueryString, ActionsType, BaseActionTypeConfigs } from './util';
import normalActions from './normalActions';

export interface Redirect {
  componentName: string;
  message?: string;
}

export type AutoLoading = boolean | string;

export interface ApiConfig {
  /**
   * path (also use as action name)
   */
  path: string | (() => string);
  /**
   * http method (default: GET)
   */
  method?: string;
  /**
   * Determine whether show message when request success
   */
  message?: boolean | string;
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
  dataMode?: 'query' | 'body';
  /**
   * 指定basePath，覆盖全局的basePath
   */
  basePath?: ApiBasePath;

  /**
   * api请求自动改变loading状态，默认为 false
   */
  autoLoading?: AutoLoading;
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

let message = null;
let requestHeaders = {};

export function setMessageObj(obj: any) {
  message = obj;
}

export function setRequestHeaders(headers) {
  requestHeaders = headers;
}

export function getAutoLoadingActionNames(modelName) {
  return {
    start: `${modelName}-startLoading`,
    end: `${modelName}-endLoading`,
  };
}

export const API_REQUEST_COMPLETE_ACTIONNAME = 'API_REQUEST_COMPLETE';

export type ApiBasePath = string | (() => string);

export function initApi<T extends ApiActionConfigs<T>>(
  basePath: ApiBasePath, configs: T, modelName: string): Api<T> {
  function makeEffect(api: ApiConfig, request: any, actionNames: ApiActionNames) {
    return function* (req) {
      const payload = req.payload || {};
      const { except, ...others } = payload;
      try {
        const response = yield call(request, others);
        yield call(checkAutoLoading, api, 'end');
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
        yield call(checkAutoLoading, api, 'end');
        yield put(createAction<any>(API_REQUEST_COMPLETE_ACTIONNAME)({
          actionNames: actionNames,
          req: payload,
          error: error,
          except: Object.assign({}, except),
        }));
      }
    };
  }

  function* checkAutoLoading(api: ApiConfig, loadingType: 'start' | 'end') {
    if (isAutoLoading(api.autoLoading)) {
      yield put({
        type: getAutoLoadingActionNames(modelName)[loadingType],
        payload: {
          loading: typeof api.autoLoading === 'string' ? api.autoLoading : 'loading',
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
            yield call(checkAutoLoading, api, 'start');
            yield fork(apiSaga, req);
          }
        },
      ];
    } else {
      return [function* () {
        while (true) {
          const req = yield take(actionNames.request);
          yield call(checkAutoLoading, api, 'start');
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
    let request = makeRequest(basePath, config);
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

function isAutoLoading(autoLoading: AutoLoading) {
  return autoLoading === true || typeof autoLoading === 'string';
}

function getMethod(api: ApiConfig) {
  // 默认method是POST
  let method = 'POST';
  if (api.method) {
    method = api.method;
  }

  return method;
}

function getApiPath(apiPath) {
  return typeof apiPath === 'function' ? apiPath() : apiPath;
}

const reg = new RegExp(/\/:\w+/);

function makeRequest(basePath: ApiBasePath, api: ApiConfig) {
  return async (data) => {
    let trueBasePath = basePath;
    if (api.basePath) {
      trueBasePath = api.basePath;
    }
    if (typeof basePath === 'function') {
      trueBasePath = basePath();
    }
    const path = getApiPath(api.path);
    let uri = trueBasePath + path;
    let method = getMethod(api);
    let upperCaseMethod = method.toUpperCase();
    let opts: any = {
      headers: requestHeaders,
      method: method,
    };
    // 匹配path中含有":"开头的路径
    let pathKey = path.match(reg) && path.match(reg)[0].slice(2);
    if (pathKey) {
      let pathId = data && data[pathKey];
      if (pathId !== null && pathId !== undefined) {
        uri = uri.replace(reg, '/' + pathId);
        delete data[pathKey]; // 把对应的id取出来拼接到了uri,删除原始数据中的id;
      } else {
        console.error(`请检查传递参数是否缺少${pathKey}`);
      }
    }

    let useQuery = false;
    if (api.dataMode) {
      useQuery = api.dataMode === 'query';
    } else {
      useQuery = upperCaseMethod === 'GET';
    }
    if (useQuery) {
      let query = getQueryString(data);
      if (query) {
        uri += '?' + query;
      }
    } else {
      opts = {
        ...opts,
        body: JSON.stringify(data) || null,
      };
    }
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

export function defaultRequestErrorHandle(res) {
  if (res.payload.error) {
    return res.payload.error;
  }

  return null;
}

function handleMessage(apiConfig: ApiConfig) {
  if (apiConfig.message) {
    let text = '';
    if (typeof apiConfig.message === 'string') {
      text = apiConfig.message;
    }
    if (message && text) {
      message.success(text);
    }
  }
}

function* handleRedirect(apiConfig: ApiConfig) {
  if (apiConfig.redirect) {
    handleMessage({
      ...apiConfig,
      message: apiConfig.redirect.message,
    });
    yield put(normalActions.redirect({
      componentName: apiConfig.redirect.componentName,
    }));
  }
}

export function defaultProcessRes(res) {
  return res;
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
        yield call(handleRedirect, apiConfig);
        handleMessage(apiConfig);
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
