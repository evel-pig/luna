import { combineReducers } from 'redux';
import { REHYDRATE } from './constants';
import PersisitCore, { PersistCoreConfig } from './persistCore';

export interface PersistConfig extends PersistCoreConfig {
}

export default function persistReducer(persist: PersisitCore, reducers) {

  const baseReducer = combineReducers(reducers);

  return (state, action) => {
    if (action.type === REHYDRATE) {
      if (action.key === persist.storageKey) {
        let reducedState = baseReducer(state, action);
        const reconciledState = persist.stateReconciler(action.payload, state, reducedState);
        persist.update(reconciledState);
        return reconciledState;
      }
    }

    if (persist) {
      let newState = baseReducer(state, action);
      if (newState === state) {
        return state;
      }

      persist.update(newState);

      return newState;
    }
    return baseReducer(state, action);
  };
}
