import { initAction, ActionNamesType, SimpleActionConfigs } from './initAction';
import { initApi, ApiActionConfigs, ApiActionNamesType, createRequestCompleteSaga,
defaultRequestErrorHandle,
setMessageObj,
ApiActionNames,
Api,
defaultProcessRes,
ApiBasePath, getAutoLoadingActionNames} from './initApi';
import { handleActions as handleActionsCore } from 'redux-actions';
import { ActionsType } from './util';
export { setRequestHeaders, isApiAction, LOADING_SUFFIX, isLoadingAction } from './initApi';
import createRestApi, { RestApiActionConfigs, RestApi, RestApiActionNamesType, RestAction } from './restApi';
import { CreateShowLoadingOptions, createShowLoadingMiddleware } from './middlewares';

let basePath: ApiBasePath = '';

function getBasePath() {
  if (typeof basePath === 'string') {
    return basePath;
  }
  return basePath();
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
  basePath?: ApiBasePath;
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
  let api: Api<A> = null;
  let restApi: RestApi<RA> = null;
  if (options.action) {
    const myBasePath = options.basePath || getBasePath;
    if (options.action.simple) {
      simpleActions = initAction(options.action.simple, options.modelName);
    }
    if (options.action.api) {
      api = initApi(myBasePath, options.action.api, options.modelName);
    }
    if (options.action.restApi) {
      restApi = createRestApi(myBasePath, options.action.restApi, options.modelName);
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
  basePath?: ApiBasePath;
  /**
   * api请求错误处理
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
}

export function configureModel(options: ConfigureModelOptions = {}) {
  const requestCompleteSaga = createRequestCompleteSaga(
    options.requestErrorHandle || defaultRequestErrorHandle,
    options.processRes || defaultProcessRes,
  );

  const sagas = [
    requestCompleteSaga,
  ];

  setMessageObj(options.message);

  basePath = options.basePath;

  let middlewares = [];
  if (options.showLoadingOption) {
    middlewares.push(createShowLoadingMiddleware(options.showLoadingOption));
  }

  return {
    sagas: {
      luna: sagas,
    },
    middlewares,
  };
}
