import { createStore, applyMiddleware, compose } from 'redux';
import createSagaMiddleware from 'redux-saga';
export const sagaMiddleware = createSagaMiddleware() as any;
import { fork } from 'redux-saga/effects';
import { PersistConfig, persistStore, PersisitCore } from '../persist';

export interface StoreConfig {
  middlewares?: any[];
}

declare const window: any;
export default function configureStore(
  initialState = {},
  customPersistConfig?: PersistConfig,
  config: StoreConfig = {}) {
    let persist = null;
    if (customPersistConfig && customPersistConfig.key) {
      persist = new PersisitCore(customPersistConfig);
    }

    let middlewares = config.middlewares || [];
    middlewares = [
      ...middlewares,
      sagaMiddleware,
    ];
    const enhancer = compose(
      applyMiddleware(...middlewares),
      process.env.NODE_ENV === 'development' ?
      (window.devToolsExtension ? window.devToolsExtension() : f => f) : f => f,
    );

    const store = createStore(() => { return {}; }, initialState, enhancer as any) as any;
    let persistor = persist ? persistStore(store, persist) : null;

    return { persistor, store };
}

export function generateSagas(sagas: any[]) {
  const appSaga = function* () {
    for (let i = 0; i < sagas.length; i++) {
      yield fork(sagas[i]);
    }
  };

  return appSaga;
}
