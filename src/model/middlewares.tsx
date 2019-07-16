import { isLoadingAction, ShowLoading } from './initApi';
import { isRequestAction, handleMessage } from './apiHelper';
import normalActions from './normalActions';

export interface CreateShowLoadingOptions {
  onStart: (showLoading: ShowLoading) => void;
  onEnd: (showLoading: ShowLoading) => void;
}

export const createShowLoadingMiddleware = (options: CreateShowLoadingOptions) => store => next => action => {
  let result = next(action);

  const showLoading = action && action.payload && action.payload.showLoading;
  if (isLoadingAction.start(action) && showLoading) {
    options.onStart(showLoading);
  }
  if (isLoadingAction.end(action) && showLoading) {
    options.onEnd(showLoading);
  }

  return result;
};

export interface CreateApiErrorOptions {
  handleError: (action, next, result) => void;
}

export const createApiErrorMiddleware = (options: CreateApiErrorOptions) => store => next => action => {
  let result = next(action);

  if (isRequestAction(action).error && options &&  options.handleError) {
    options.handleError(action, next, result);
  }

  return result;
};

export interface CreateApiSuccessMiddlewareOptions {
  handleSuccess: (action, next, result) => void;
}

export const createApiSuccessMiddleware = (options: CreateApiSuccessMiddlewareOptions) => store => next => action => {
  let result = next(action);

  if (action.type === normalActions.apiComplete().type) {
    if (options && options.handleSuccess) {
      options.handleSuccess(action, next, result);
    } else {
      if (action.payload.redirect) {
        handleMessage(action.payload.redirect.message);
        next(normalActions.redirect({
          componentName: action.payload.redirect.componentName,
        }));
      }
      if (action.payload.message) {
        handleMessage(action.payload.message);
      }
    }
  }

  return result;
};
