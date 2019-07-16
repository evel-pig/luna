import { getQueryString } from './util';

let _errorHandle = null;
let _processRes = defaultProcessRes;

export function setErrorHandle(e) {
  _errorHandle = e;
}

export function setProcessRes(res) {
  _processRes = res;
}

export function getErrorHandle() {
  return _errorHandle;
}

export function getProcessRes() {
  return _processRes;
}

export type ApiPath = string | (() => string);

let _basePath: ApiPath = '';
let requestHeaders = () => {
  return {};
};

export function setRequestHeaders(headers: typeof requestHeaders) {
  requestHeaders = headers;
}

export function setBasePath(newBasePath: typeof _basePath) {
  _basePath = newBasePath;
}

export function getBasePath(path?) {
  let realPath = path || _basePath;
  return getApiPath(realPath);
}

export function getRequestHeaders() {
  return requestHeaders();
}

function getMethod(method: string) {
  // 默认method是POST
  let m = 'POST';
  if (method) {
    m = method.toUpperCase();
  }

  return m;
}

export function getApiPath(path: ApiPath) {
  if (typeof path === 'string') {
    return path;
  }
  if (typeof path === 'function') {
    return path();
  }
  return '';
}

const reg = new RegExp(/\/:\w+/);

export type ApiDataMode = 'query' | 'body';

export interface ApiOptionsConfig {
  /**
   * 请求路径，跟model一样支持/users/:id
   */
  path: ApiPath;
  /**
   * 公共路径
   */
  basePath?: ApiPath;
  /**
   * get, post...
   */
  method?: string;
  /**
   * 请求参数
   */
  data?: any;
  /**
   * 请求参数模式
   */
  dataMode?: ApiDataMode;
  /**
   * fetch options
   */
  options?: any;
}

export function getApiOptions({ path, basePath, method, data, dataMode, options = {} }: ApiOptionsConfig) {
  const truePath = getApiPath(path);
  const trueBasePath = getBasePath(basePath);
  let uri = trueBasePath + truePath;
  let trueMethod = getMethod(method);
  let opts: any = {
    headers: getRequestHeaders(),
    method: method,
  };
  // 匹配path中含有":"开头的路径
  let pathKey = truePath.match(reg) && truePath.match(reg)[0].slice(2);
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
  if (dataMode) {
    useQuery = dataMode === 'query';
  } else {
    useQuery = trueMethod === 'GET';
  }
  if (useQuery) {
    let query = getQueryString(data);
    if (query) {
      uri += '?' + query;
    }
  } else {
    opts = {
      ...options,
      ...opts,
      method: trueMethod,
      body: JSON.stringify(data) || null,
    };
  }

  return {
    uri,
    opts,
  };
}

export function defaultProcessRes(res) {
  return res;
}

export let message = null;

export function setMessageObj(obj: any) {
  message = obj;
}

const apiReg = {
  api: /^api-/,
  succes: /_success$/,
  error: /_error$/,
};

export function isRequestAction(action) {
  const isApi = apiReg.api.test(action.type);
  return {
    success: isApi && apiReg.error.test(action.type),
    error: isApi && apiReg.error.test(action.type),
  };
}

export type ApiSuccessMessage = boolean | string;

export function handleMessage(m: ApiSuccessMessage) {
  if (m) {
    let text = '';
    if (typeof m === 'string') {
      text = m;
    }
    if (message && text) {
      message.success(text);
    }
  }
}
