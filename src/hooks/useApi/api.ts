import xFetch from '../../model/enhanceFetch';
import { ApiOptionsConfig, getApiOptions, defaultProcessRes } from '../../model/apiHelper';

let _errorHandle = null;
let _processRes = defaultProcessRes;

export interface ConfigureApiOptions {
  errorHandle?: typeof _errorHandle;
  processRes: typeof _processRes;
}

export function configureApi({ errorHandle, processRes }: ConfigureApiOptions) {
  if (errorHandle) {
    _errorHandle = errorHandle;
  }
  if (processRes) {
    _processRes = processRes;
  }
}

class Api {
  request<T = any>(options: ApiOptionsConfig) {
    return new Promise<T>((resolve, reject) => {
      try {
        const { uri, opts } = getApiOptions(options);
        xFetch(uri, opts).then(resData => {
          let error = null;
          if (_errorHandle) {
            error = _errorHandle({
              payload: {
                res: resData,
              },
            });
          }
          if (error) {
            reject(error);
          } else {
            resolve(_processRes(resData));
          }
        }).catch(err => {
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}

const api = new Api();

export default api;
