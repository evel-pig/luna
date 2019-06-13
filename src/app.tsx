import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import configureStore, { sagaMiddleware, generateSagas, StoreConfig } from './store';
import { PersistConfig, PersistWrapper } from './persist';
import { configureModel, ConfigureModelOptions } from './model';
export { StoreConfig } from './store';
export { ConfigureModelOptions } from './model';
import { combineReducers } from 'redux';

export interface AppPersistConfig extends PersistConfig {
  /**
   * 设置缓存加载时的Loading组件
   */
  wrapperLoadingComponent?: React.ReactNode;
}

export interface AppOptions {
  /**
   * 持久化配置
   */
  persistConfig?: AppPersistConfig;
  /**
   * model配置
   */
  model?: ConfigureModelOptions;
  /**
   * redux配置
   */
  store?: StoreConfig;
  /**
   * 渲染内容
   */
  render: () => React.ReactNode;
}

export default class App {
  store: any;
  private _persistor: any;
  private _reducers: any;
  private _render: () => React.ReactNode;

  constructor(options: AppOptions) {
    let storeOptions = options.store || {
      middlewares: [],
    };
    const persistConfig = {
      ...(options.persistConfig || {}),
    };
    const model = configureModel(options.model);
    storeOptions.middlewares = model.middlewares.concat(storeOptions.middlewares);
    const { store, persistor } = configureStore({}, persistConfig, storeOptions);
    this.store = store;
    this._persistor = persistor;
    this._reducers = {};
    this._render = options.render;
    this.model({
      app: () => null,
    }, model.sagas);

    PersistWrapper.setDefaultLoadingComponent(() => {
      return persistConfig.wrapperLoadingComponent || null;
    });

    window['store'] = this.store;
    window['inejctAppModel'] = this.model.bind(this);
  }

  model(reducers, sagas) {
    // 检查sagas是不是数组
    if (Object.prototype.toString.call(sagas) === '[object Array]') {
      console.warn('注入model失败，sagas必须为对象，不能是数组');
      console.warn('reducers: ', reducers);
      console.warn('sagas: ', sagas);
      return;
    }

    let loadSagas = [];
    const loadedModelKeys = Object.keys(this._reducers);
    const sagaKeys = Object.keys(sagas);
    sagaKeys.forEach(key => {
      if (loadedModelKeys.indexOf(key) < 0) {
        // 不包含api的model很多时候是没有saga
        if (sagas[key]) {
          loadSagas = loadSagas.concat(sagas[key]);
        }
      }
    });
    const newReducers = {};
    Object.keys(reducers).forEach(key => {
      if (reducers[key] && !this._reducers[key]) {
        newReducers[key] = reducers[key];
      }
    });
    this._reducers = {
      ...this._reducers,
      ...newReducers,
    };
    let reducer = null;
    if (this._persistor) {
      reducer = this._persistor.getReducer(this._reducers);
    } else {
      reducer = combineReducers(this._reducers);
    }
    if (Object.keys(newReducers).length > 0) {
      this.store.replaceReducer(reducer);
    }
    if (loadSagas.length > 0) {
      sagaMiddleware.run(generateSagas(loadSagas));
    }
  }

  start(containerId: string) {
    let render = () => {
      ReactDOM.render(
        <PersistWrapper persistor={this._persistor}>
          <Provider store={this.store}>
            {this._render()}
          </Provider>
        </PersistWrapper>,
        document.getElementById(containerId),
      );
    };

    render();
  }

  persist() {
    if (this._persistor) {
      this._persistor.persist();
    }
  }

  currentReducers() {
    return this._reducers;
  }
}
