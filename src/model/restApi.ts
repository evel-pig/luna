import { ApiActionNames, initApi, ApiConfig, AutoLoading, ShowLoading, ApiGlobalConfig } from './initApi';
import { BaseActionTypeConfigs } from './util';

export interface RestApiConfig {
  path: string;
  /**
   * index请求ApiConfig
   */
  indexConfig?: Partial<ApiConfig>;
  /**
   * show请求ApiConfig
   */
  showConfig?: Partial<ApiConfig>;
  /**
   * create请求ApiConfig
   */
  createConfig?: Partial<ApiConfig>;
  /**
   * update请求ApiConfig
   */
  updateConfig?: Partial<ApiConfig>;
  /**
   * destory请求ApiConfig
   */
  destoryConfig?: Partial<ApiConfig>;
    /**
   * api请求自动改变loading状态，默认为 false
   */
  autoLoading?: AutoLoading;
  /**
   * api请求时是否显示loading组件，默认为false
   */
  showLoading?: ShowLoading;
  /**
   * 请求路径的id标示
   */
  pathKey?: string;
}

export interface RestApiMethod<T> {
  index: T;
  show: T;
  create: T;
  update: T;
  destory: T;
}

export type RestApiActionConfigs<T = any> = BaseActionTypeConfigs<T, RestApiConfig>;

interface RestActionPayload {
  // id?: any;
}

export type RestApiActionNamesType<T = any, K = any> = { [key in keyof T]: RestApiMethod<K> };

export interface RestAction {
  <T extends RestActionPayload>(payload: T): any;
}

export interface RestApi<T> {
  apiActionNames: RestApiActionNamesType<T, ApiActionNames>;
  apiActions: RestApiActionNamesType<T, RestAction>;
  sagas: any[];
}

function createApiConfig(
globalConfig: Partial<ApiConfig>,
config: RestApiConfig, actionName, childConfigkey: string, method: string, pathKey?: string) {
  return {
    [actionName]: {
      ...globalConfig,
      ...(config[childConfigkey] || {}),
      path: pathKey ? `${config.path}/:${pathKey}` : config.path,
      method: method,
    } as ApiConfig,
  };
}

function getActionName(baseActionName, key) {
  return `${baseActionName}-${key}`;
}

// tslint:disable-next-line:max-line-length
export default function createRestApi<T extends RestApiActionConfigs<T>>(globalApiConfig: ApiGlobalConfig, restApiConfigs: T, modelName): RestApi<T> {
  const apiActions = {} as any;
  const apiActionNames = {} as any;
  let sagas = [];
  Object.keys(restApiConfigs).forEach(key => {
    const item: RestApiConfig = restApiConfigs[key];
    let apiAction = {};
    let apiActionName = {};
    const indexActionName = getActionName(key, 'index');
    const showActionName = getActionName(key, 'show');
    const createActionName = getActionName(key, 'create');
    const updateActionName = getActionName(key, 'update');
    const destoryActionName = getActionName(key, 'delete');
    const commonConfig = {
      autoLoading: item.autoLoading,
      showLoading: item.showLoading,
    };
    const pathKey = item.pathKey || 'id';
    const indexApi = initApi(globalApiConfig, createApiConfig(
      commonConfig, item, indexActionName, 'indexConfig', 'GET'), modelName);
    const showApi = initApi(globalApiConfig, createApiConfig(
      commonConfig, item, showActionName, 'showConfig', 'GET', pathKey), modelName);
    const createApi = initApi(globalApiConfig, createApiConfig(
      commonConfig, item, createActionName, 'createConfig', 'POST'), modelName);
    const updateApi = initApi(globalApiConfig, createApiConfig(
      commonConfig, item, updateActionName, 'updateConfig', 'PUT', pathKey), modelName);
    const destoryApi = initApi(globalApiConfig, createApiConfig(
      commonConfig, item, destoryActionName, 'destoryConfig', 'DELETE', pathKey), modelName);
    apiAction = {
      index: indexApi.apiActions[indexActionName],
      show: showApi.apiActions[showActionName],
      create: createApi.apiActions[createActionName],
      update: updateApi.apiActions[updateActionName],
      destory: destoryApi.apiActions[destoryActionName],
    };
    apiActionName = {
      index: indexApi.apiActionNames[indexActionName],
      show: showApi.apiActionNames[showActionName],
      create: createApi.apiActionNames[createActionName],
      update: updateApi.apiActionNames[updateActionName],
      destory: destoryApi.apiActionNames[destoryActionName],
    };
    apiActions[key] = apiAction;
    apiActionNames[key] = apiActionName;
    sagas = sagas.concat(indexApi.sagas, showApi.sagas, createApi.sagas, updateApi.sagas, destoryApi.sagas);
  });

  return {
    apiActionNames,
    apiActions,
    sagas,
  };
}
