import { useState, useEffect } from 'react';
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
  const [ data, setData ] = useState({} as T);
  const [ loading, setLoading ] = useState(false);
  const [ success, setSuccess ] = useState(false);
  let canSetData = true;
  const [ prevParams, setPrevParams ] = useState(apiOptions.data);
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

  function request(newParams = prevParams, newOptions = apiOptions.options) {
    setPrevParams(newParams);
    setLoading(true);
    setSuccess(false);
    canSetData = true;
    api.request({
      ...apiOptions,
      data: newParams,
      options: newOptions,
    }).then(resData => {
      setLoading(false);
      if (canSetData) {
        setData(resData);
        setSuccess(true);
        if (dispatch) {
          dispatch(normalActions.apiComplete({
            message: realOptions.message,
          }));
        }
      }
    }).catch(err => {
      console.log(err);
      setSuccess(false);
      setLoading(false);
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
    data,
    request,
    loading,
    success,
  };
}
