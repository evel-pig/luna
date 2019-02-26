import { createAction } from 'redux-actions';
import { ActionsType, BaseActionTypeConfigs } from './util';

export type SimpleActionConfigs<T = any> = BaseActionTypeConfigs<T, string>;

export function createActionName(key, modelName) {
  return `${modelName}/${key}`;
}

export function createSimpleAction(actionName) {
  return createAction(actionName);
}

export type ActionNamesType<T = any> = {[p in keyof T]: string};

export function initAction<T extends SimpleActionConfigs<T>>(configs: T, modelName: string) {
  let actions: ActionsType<T> = {} as any;
  let actionNames: ActionNamesType<T> = {} as any;

  Object.keys(configs).forEach(key => {
    let actionName = `${modelName}-${configs[key]}`;
    actionNames[key] = actionName;
    actions[key] = createAction(actionName);
  });

  return {
    actions,
    actionNames,
  };
}
