import { initAction, ActionNamesType, SimpleActionConfigs } from './initAction';
import { initApi, ApiActionConfigs, ApiActionNamesType,
ApiActionNames,
Api, getAutoLoadingActionNames, ApiConfig, AutoLoading} from './initApi';
import { handleActions as handleActionsCore } from 'redux-actions';
import { ActionsType, BaseActionTypeConfigs } from './util';
export { isApiAction, LOADING_SUFFIX, isLoadingAction } from './initApi';
import createRestApi, { RestApiActionConfigs, RestApi, RestApiActionNamesType, RestAction
, RestApiConfig } from './restApi';
import { CreateShowLoadingOptions, createShowLoadingMiddleware
, CreateApiErrorOptions, createApiErrorMiddleware, CreateApiSuccessMiddlewareOptions
, createApiSuccessMiddleware } from './middlewares';
import { setBasePath, ApiPath, setMessageObj, setErrorHandle, setProcessRes, defaultProcessRes } from './apiHelper';
export { isRequestAction, setRequestHeaders } from './apiHelper';

let _globalAutoLoading: AutoLoading = false;

function getGlobalAutoLoading() {
  return _globalAutoLoading;
}

export interface AllActions<T, ApiT, RestApiT> {
  simple: ActionsType<T>;
  api: ActionsType<ApiT>;
  restApi: RestApiActionNamesType<RestApiT, RestAction>;
}

export interface AllActionNames<T, A, RA> {
  simple: ActionNamesType<T>;
  api: ApiActionNamesType<A>;
  restApi: RestApiActionNamesType<RA, ApiActionNames>;
}

export interface ReducerOptions<SimpleKeys = any, ApiKeys = any, RestApiKeys = any> {
  simpleActionNames: ActionNamesType<SimpleKeys>;
  apiActionNames: ApiActionNamesType<ApiKeys>;
  restApiActionNames: RestApiActionNamesType<RestApiKeys, ApiActionNames>;
  createReducer: typeof handleActionsCore;
}

// tslint:disable-next-line:max-line-length
export interface ModelOptions<S extends SimpleActionConfigs<S>, A extends ApiActionConfigs<A>, RA extends RestApiActionConfigs<RA>> {
  /**
   * model名称
   */
  modelName: string;
  /**
   * action配置
   */
  action?: {
    /** 普通 */
    simple?: SimpleActionConfigs<S>;
    /** api */
    api?: ApiActionConfigs<A>;
    /** restful api */
    restApi?: RestApiActionConfigs<RA>;
  };
  // tslint:disable-next-line:max-line-length
  reducer?: (options: ReducerOptions<S, A, RA>) => any;
  sagas?: (model: Model<S, A, RA>) => any[];
  basePath?: ApiPath;
}

export interface Model<T, ApiT, RestApiT> {
  modelName: string;
  sagas: any[];
  reducer: any;
  actionNames: AllActionNames<T, ApiT, RestApiT>;
  actions: AllActions<T, ApiT, RestApiT>;
}

// tslint:disable-next-line:max-line-length
export default function createModel<S extends SimpleActionConfigs<S>, A extends ApiActionConfigs<A>, RA extends RestApiActionConfigs<RA>>(
  options: ModelOptions<S, A, RA>): Model<S, A, RA> {
  let simpleActions = null;
  let api: Api<BaseActionTypeConfigs<A, ApiConfig>> = null;
  let restApi: RestApi<BaseActionTypeConfigs<RA, RestApiConfig>> = null;
  if (options.action) {
    const myBasePath = options.basePath;
    if (options.action.simple) {
      simpleActions = initAction(options.action.simple, options.modelName);
    }
    if (options.action.api) {
      api = initApi({
        basePath: myBasePath,
        autoLoading: getGlobalAutoLoading,
      }, options.action.api, options.modelName);
    }
    if (options.action.restApi) {
      restApi = createRestApi({
        basePath: myBasePath,
        autoLoading: getGlobalAutoLoading,
      }, options.action.restApi, options.modelName);
    }
  }

  let model = {
    modelName: options.modelName,
    reducer: null,
    sagas: [],
    actionNames: {
      simple: {},
      api: {},
      restApi: {},
    } as any,
    actions: {
      simple: {},
      api: {},
      restApi: {},
    } as any,
  };
  if (simpleActions) {
    model.actions.simple = simpleActions.actions;
    model.actionNames.simple = simpleActions.actionNames;
  }
  if (api) {
    model.sagas = model.sagas.concat(api.sagas);
    model.actions.api = api.apiActions;
    model.actionNames.api = api.apiActionNames;
  }
  if (restApi) {
    model.sagas = model.sagas.concat(restApi.sagas);
    model.actions.restApi = restApi.apiActions;
    model.actionNames.restApi = restApi.apiActionNames;
  }

  let reducer = null;
  if (options.reducer) {
    reducer = options.reducer({
      simpleActionNames: model.actionNames.simple,
      apiActionNames: model.actionNames.api,
      restApiActionNames: model.actionNames.restApi,
      createReducer: handleActionsCore,
    });
    model.reducer = (state, action) => {
      const isAutoLoading = action.payload && action.payload.autoLoading;
      const autoLoadingActionNames = getAutoLoadingActionNames(options.modelName);
      if (autoLoadingActionNames.start === action.type && isAutoLoading) {
        return {
          ...state,
          [action.payload.autoLoading]: true,
        };
      }
      if (autoLoadingActionNames.end === action.type && isAutoLoading) {
        return {
          ...state,
          [action.payload.autoLoading]: false,
        };
      }
      return reducer(state, action);
    };
  }

  if (options.sagas) {
    const sagas = options.sagas(model);
    model.sagas = [
      ...sagas,
      ...model.sagas,
    ];
  }

  return model;
}

export interface ConfigureModelOptions {
  /**
   * 代理接口基础路径
   */
  basePath?: ApiPath;
  /**
   * api请求错误判断
   */
  requestErrorHandle?: (res) => void;
  /**
   * 进行通知的组件（api要跟antd的message组件一样）
   */
  message?: any;
  /**
   * 加工返回内容
   */
  processRes?: (res) => void;
  /**
   * 配置loading
   */
  showLoadingOption?: CreateShowLoadingOptions;
  /**
   * 全局设置 autoLoading
   */
  autoLoading?: AutoLoading;
  /**
   * api请求错误处理
   */
  apiErrorOptions?: CreateApiErrorOptions;
    /**
   * api请求成功处理
   */
  apiSuccessOptions?: CreateApiSuccessMiddlewareOptions;
}

export function configureModel(options: ConfigureModelOptions = {}) {
  const errorHandle = (res) => {
    if (res.payload.error) {
      return res.payload.error;
    }

    if (options.requestErrorHandle) {
      return options.requestErrorHandle(res);
    }

    return null;
  };

  setErrorHandle(errorHandle);
  setProcessRes(options.processRes || defaultProcessRes);

  const sagas = [
  ];

  setMessageObj(options.message);

  setBasePath(options.basePath);
  _globalAutoLoading = options.autoLoading;

  let middlewares = [];
  if (options.showLoadingOption) {
    middlewares.push(createShowLoadingMiddleware(options.showLoadingOption));
  }
  middlewares.push(createApiSuccessMiddleware(options.apiSuccessOptions));
  middlewares.push(createApiErrorMiddleware(options.apiErrorOptions));

  return {
    sagas: {
      luna: sagas,
    },
    middlewares,
  };
}
