import { REHYDRATE } from './constants';
import { createStore } from 'redux';
import PersistCore from './persistCore';
import persistReducer from './persistReducer';

const initialState = {
  initialize: false,
};

const persistorReducer = (state = initialState, action) => {
  switch (action.type) {
    case REHYDRATE:
      return {
        initialize: true,
      };
    default:
      return state;
  }
};

export default function persistStore(store, persist: PersistCore) {
  let _pStore = createStore(
    persistorReducer,
    initialState,
    undefined,
  );

  let persistor = {
    ..._pStore,
    persist: () => {
      const storeState = persist.getStore();
      const rehydrateAction = {
        type: REHYDRATE,
        payload: storeState,
        key: persist.storageKey,
      };
      store.dispatch(rehydrateAction);
      _pStore.dispatch(rehydrateAction);
    },
    getReducer: (reducers) => {
      const reducer = persistReducer(persist, { ...reducers });

      return reducer;
    },
  };

  return persistor;
}
