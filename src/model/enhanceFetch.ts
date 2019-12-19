const fetch = require('isomorphic-fetch');
require('es6-promise').polyfill();

/**
 * check network
 */
let checkNetwork = (res) => {
  if (res.status / 200 !== 1) {
    return Promise.reject({
      des: `http status ${res.status}, network error`,
      status: res.status,
    });
  }
  return res;
};

export function setCheckNextWork(p: (res) => any) {
  checkNetwork = p;
}

/**
 * handle response result
 */
function jsonParse(res) {
  return res.json().then(jsonResult => jsonResult);
}

function xFetch(url, options) {
  const opts = options;
  opts.headers = {
    ...opts.headers,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  return fetch(url, opts)
    .then(checkNetwork)
    .then(jsonParse);
}

export default xFetch;
