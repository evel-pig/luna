import xFetch from '../../model/enhanceFetch';
import { ApiOptionsConfig, getApiOptions, getErrorHandle, getProcessRes } from '../../model/apiHelper';

class Api {
  request<T = any>(options: ApiOptionsConfig) {
    return new Promise<T>((resolve, reject) => {
      try {
        const { uri, opts } = getApiOptions(options);
        xFetch(uri, opts).then(resData => {
          let error = getErrorHandle()({
            payload: {
              res: resData,
            },
          });
          if (error) {
            reject(error);
          } else {
            resolve(getProcessRes()(resData));
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
