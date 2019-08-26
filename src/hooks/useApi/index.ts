import { useState, useEffect, useRef } from 'react';
import api from './api';
import { useDispatch } from 'react-redux';
import { ApiOptionsConfig, ApiSuccessMessage } from '../../model/apiHelper';
import normalActions from '../../model/normalActions';

export interface UseApiOptions {
  requestFirstTime?: boolean;
  message?: ApiSuccessMessage;
}

export default function useApi<T = any>(
  apiOptions: ApiOptionsConfig,
  options: UseApiOptions = { requestFirstTime: true },
) {
  const realOptions: UseApiOptions = {
    requestFirstTime: true,
    ...options,
  };
  const data = useRef<T>({} as any);
  const prevParams = useRef(apiOptions.data);
  const [ status, setStatus ] = useState({
    loading: false,
    success: false,
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
        data.current = resData;
        setStatus({
          loading: false,
          success: true,
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
    data: data.current,
    request,
    loading: status.loading,
    success: status.success,
  };
}
