/**
 * 格式化查询参数
 * @param obj 查询对象
 * @returns 查询字符串
 */
export function getQueryString(obj) {
  let str = '';
  if (!obj) {
    return str;
  }
  Object.keys(obj).forEach(key => {
    if (typeof obj[key] !== 'undefined') {
      str += `${key}=${obj[key]}&`;
    }
  });
  str = str.replace(/\&$/, '');

  return str;
}

import { ActionFunctionAny, Action } from 'redux-actions';
export type ActionsType<T = any> = { [key in keyof T]: ActionFunctionAny<Action<{}>> };

export type BaseActionTypeConfigs<T = any, K = any> = {[key in keyof T]: K};
