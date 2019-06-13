import { useSelector, useDispatch } from 'react-redux';
import { useRef } from 'react';

export default function useModel<S = any, A = any>(model: any) {
  let modelName = model;
  let actions = null;
  let isInject = false;
  const r = useRef(isInject);
  if (typeof model === 'object') {
    let _m = model;
    if (model.default) {
      _m = model.default;
    }
    actions = _m.actions;
    modelName = _m.modelName;
    const reducers = {
      [_m.modelName]: _m.reducer,
    };
    const sagas = {
      [_m.modelName]: _m.sagas,
    };
    if (window['inejctAppModel'] && !r.current) {
      r.current = true;
      window['inejctAppModel'](reducers, sagas);
    }
  }

  const s = useSelector<any, S>(state => state[modelName]);

  const dispatch = useDispatch();

  return [s, dispatch, actions] as [S, ReturnType<typeof useDispatch>, A];
}
