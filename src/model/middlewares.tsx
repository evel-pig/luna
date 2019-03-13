import { isLoadingAction, ShowLoading } from './initApi';

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
