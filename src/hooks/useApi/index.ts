import { useState, useEffect, useRef } from 'react';
import api from './api';
import { useDispatch } from 'react-redux';
import { ApiOptionsConfig, ApiSuccessMessage } from '../../model/apiHelper';
import normalActions from '../../model/normalActions';

export interface UseApiOptions {
  requestFirstTime?: boolean;
  message?: ApiSuccessMessage;
  clearDataWhenRequestError?: boolean;
}

interface ApiStatus<T> {
  loading: boolean;
  success: boolean;
  data: T;
}

export default function useApi<T = any>(
  apiOptions: ApiOptionsConfig,
  options: UseApiOptions = { requestFirstTime: true },
) {
  const realOptions: UseApiOptions = {
    requestFirstTime: true,
    clearDataWhenRequestError: false,
    ...options,
  };
  const prevParams = useRef(apiOptions.data);
  const [ status, setStatus ] = useState<ApiStatus<T>>({
    loading: false,
    success: false,
    data: {} as T,
  });
  let canSetData = true;
  let dispatch = null;
  try {
    dispatch = useDispatch();
  } catch (err) {
  }

  function sendError(err) {
    if (dispatch) {
      dispatch({
        type: 'api-useApi_error',
        payload: {
          error: err,
        },
      });
    }
  }

  function request(newParams = prevParams.current, newOptions = apiOptions.options) {
    setStatus({
      ...status,
      loading: true,
      success: false,
    });
    canSetData = true;
    prevParams.current = newParams;
    api.request({
      ...apiOptions,
      data: newParams,
      options: newOptions,
    }).then(resData => {
      if (canSetData) {
        setStatus({
          loading: false,
          success: true,
          data: resData,
        });
        if (dispatch) {
          dispatch(normalActions.apiSuccess({
            message: realOptions.message,
          }));
        }
      }
    }).catch(err => {
      console.log(err);
      setStatus({
        data: realOptions.clearDataWhenRequestError ? {} as T : status.data,
        loading: false,
        success: false,
      });
      sendError(err);
    });
  }

  useEffect(() => {
    if (realOptions.requestFirstTime) {
      request();
    }

    return (() => {
      canSetData = false;
    });
  }, [apiOptions.path]);

  return {
    data: status.data,
    request,
    loading: status.loading,
    success: status.success,
  };
}
