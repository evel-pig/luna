import storage from './storage';
import autoMergeLevel2 from './stateReconciler/autoMergeLevel2';

export interface PersistCoreConfig {
  /**
   * 持久化的key
   */
  key?: string;
  /**
   * 白名单
   */
  whiteList?: any[];
  /**
   * 转换
   */
  transforms?: any[];
  /**
   * State reconcilers define how incoming state is merged in with initial state.
   */
  stateReconciler?: any;
}

export default class PersisitCore {
  storageKey: string;
  stateReconciler: any;
  private _whiteList: any[];
  private _transforms: any[];
  private _lastState: any;
  private _processKeys: any[];
  private _timeIterator: any;
  private _stagedState: any;

  constructor(config: PersistCoreConfig) {
    this.storageKey = `luna-persist:${config.key}`;
    this._whiteList = config.whiteList;
    this._transforms = config.transforms || [];
    this._lastState = {};
    this._timeIterator = null;
    this._processKeys = [];
    this._stagedState = {};
    this.stateReconciler = config.stateReconciler || autoMergeLevel2;
  }

  update(state) {
    Object.keys(state).forEach(key => {
      if (!this.passWhitelistBlacklist(key)) {
        return;
      }

      if (this._lastState[key] === state[key]) {
        return;
      }

      if (this._processKeys.indexOf(key) >= 0) {
        return;
      }

      this._processKeys.push(key);
    });

    this._lastState = state;

    if (this._timeIterator === null) {
      this._timeIterator = setInterval(this.process.bind(this), 0);
    }
  }

  getStore() {
    const storeState = storage.getState(this.storageKey);
    let rawState = storeState || {};
    let state = {};
    try {
      Object.keys(rawState).forEach(key => {
        state[key] = this._transforms.reduceRight((subState, transformer) => {
          return transformer.out(subState, key, rawState);
        }, JSON.parse(rawState[key]));
      });

      return state;
    }  catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(
          `luna-persist/persisit/getStore: Error restoring data ${storeState}`,
          err,
        );
      }
      throw err;
    }
  }

  private process() {
    if (this._processKeys.length === 0) {
      if (this._timeIterator) {
        clearInterval(this._timeIterator);
      }
      this._timeIterator = null;
      return;
    }

    let key = this._processKeys.shift();

    let endState = this._transforms.reduce((subState, transformer) => {
      return transformer.in(subState, key, this._lastState);
    }, this._lastState[key]);

    this.stagedWrite(key, endState);
  }

  private stagedWrite(key, endState) {
    try {
      this._stagedState[key] = JSON.stringify(endState);
    } catch (err) {
      console.error(
        'luna-persist/persisit/stagedWrite: error serializing state',
        err,
      );
    }

    if (this._processKeys.length === 0) {
      Object.keys(this._stagedState).forEach(k => {
        if (this._lastState[k] === undefined) {
          delete this._stagedState[k];
        }
      });

      storage.setState(this.storageKey, JSON.stringify(this._stagedState));
    }
  }

  private passWhitelistBlacklist(key) {
    if (this._whiteList && this._whiteList.indexOf(key) === -1) {
      return false;
    }
    return true;
  }
}
