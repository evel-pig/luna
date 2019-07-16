import createModel from '../index';
import App from '../../app';
import { ApiConfig } from '../initApi';

declare const fetch: any;

jest.useFakeTimers();

interface TestModelState {
  loading: boolean;
  age: number;
  error: boolean;
}

function getModel(getAgeApiConfig: Partial<ApiConfig> = {}, modelName = 'test') {
  const restApiConfigs = {
    users: {
      path: '/users',
    },
  };

  const testModel = createModel({
    modelName: modelName,
    action: {
      simple: {
        add: 'add',
      },
      api: {
        getList: {
          path: '/getList',
        },
        getAge: {
          path: '/getAge',
          autoLoading: true,
          ...getAgeApiConfig,
        },
      },
      restApi: restApiConfigs,
    },
    reducer: ({ simpleActionNames, apiActionNames, createReducer }) => {
      return createReducer<TestModelState, any>({
        [simpleActionNames.add](state, action) {
          return {
            ...state,
            age: state.age + 1,
          };
        },
        [apiActionNames.getAge.success](state, action) {
          return {
            ...state,
            age: action.payload.res.age,
          };
        },
        [apiActionNames.getAge.error](state, action) {
          return {
            ...state,
            error: true,
          };
        },
      }, {
        age: 23,
        loading: false,
        error: false,
      });
    },
  });

  return testModel;
}

describe('model', () => {
  beforeEach(() => {
    fetch.resetMocks();
  });

  it('create model', () => {
    const testModel = getModel();

    expect(testModel.modelName).toEqual('test');
    expect(testModel.actions.api).toHaveProperty('getList');
    expect(testModel.actionNames.api).toHaveProperty('getList');
    expect(Object.keys(testModel.actionNames.restApi.users)).toEqual(['index', 'show', 'create', 'update', 'destory']);
  });

  it('reducer and action', () => {
    const testModel = getModel();

    expect(testModel.reducer({ age: 11 }, testModel.actions.simple.add())).toEqual({ age: 12 });
    expect(testModel.actions.api.getList()).toEqual({ type: 'api-test-POST-getList_request' });
    expect(testModel.actions.restApi.users.destory({ id: 1 })).toEqual({
      payload: {
        id: 1,
      },
      type: 'api-test-DELETE-users-delete_request',
    });
  });

  it('dispatch api success action and set autoLoading', done => {
    const testModel = getModel();
    const ageModel = getModel({}, 'age');

    const app = new App({
      model: {
        basePath: '/api',
      },
      render: () => {
        return null;
      },
    });

    const testReducer = (state, action) => {
      const newState = testModel.reducer(state, action);

      if (action.type === testModel.actionNames.api.getAge.success) {
        expect(state.loading).toEqual(false);
        // 通过执行 done 来判断是否触发了制定的 action
        done();
      }

      return newState;
    };

    app.model({ test: testReducer, age: ageModel.reducer }, { test: testModel.sagas, age: ageModel.sagas });

    fetch.mockResponseOnce(JSON.stringify({ age: 30 }));

    app.store.dispatch(testModel.actions.api.getAge({}));

    expect(app.store.getState().test.loading).toEqual(true);

    expect(app.store.getState().age.loading).toEqual(false);
  });

  it('dispatch api error action', done => {
    const testModel = getModel();

    const app = new App({
      model: {
        basePath: '/api',
        requestErrorHandle: (res) => {
          if (res.payload.res.code !== 200) {
            return {
              code: res.payload.res.code,
            };
          }
          return null;
        },
      },
      render: () => {
        return null;
      },
    });

    const testReducer = (state, action) => {
      const newState = testModel.reducer(state, action);

      if (action.type === testModel.actionNames.api.getAge.error) {
        done();
      }

      return newState;
    };

    app.model({ test: testReducer }, { test: [
      ...testModel.sagas,
    ] });

    fetch.mockResponseOnce(JSON.stringify({ code: -1 }));

    app.store.dispatch(testModel.actions.api.getAge({}));
  });

  it('reducer is null', () => {
    const testModel = createModel({
      modelName: 'testModel',
      sagas: () => [],
    });

    const app = new App({
      model: {
        basePath: '/api',
        requestErrorHandle: (res) => {
          if (res.payload.res.code !== 200) {
            return {
              code: res.payload.res.code,
            };
          }
          return null;
        },
      },
      render: () => {
        return null;
      },
    });

    app.model({ test: testModel.reducer }, { test: [
      ...testModel.sagas,
    ] });
  });

  it('dispatch api action with none parameters', done => {
    const testModel = getModel();

    const app = new App({
      model: {
        basePath: '/api',
      },
      render: () => {
        return null;
      },
    });

    const testReducer = (state, action) => {
      const newState = testModel.reducer(state, action);

      if (action.type === testModel.actionNames.api.getAge.success) {
        expect(action.payload.req).toEqual({});
        done();
      }

      return newState;
    };

    app.model({ test: testReducer }, { test: testModel.sagas });

    fetch.mockResponseOnce(JSON.stringify({ age: 30 }));

    app.store.dispatch(testModel.actions.api.getAge());
  });

  it('set model showLoading true', (done) => {
    const testModel = getModel({
      showLoading: true,
    });

    const handleStart = jest.fn();

    const app = new App({
      model: {
        basePath: '/api',
        showLoadingOption: {
          onStart: handleStart,
          onEnd: (showLoading) => {
            expect(showLoading).toBe(true);
            done();
          },
        },
      },
      render: () => {
        return null;
      },
    });

    app.model({ test: testModel.reducer }, { test: testModel.sagas });

    fetch.mockResponseOnce(JSON.stringify({ age: 30 }));

    app.store.dispatch(testModel.actions.api.getAge());

    expect(handleStart).toBeCalledWith(true);
  });

  it('set model showLoading false', () => {
    const testModel = getModel({
      showLoading: false,
    });

    const handleStart = jest.fn();

    const app = new App({
      model: {
        basePath: '/api',
        showLoadingOption: {
          onStart: handleStart,
          onEnd: (showLoading) => {
          },
        },
      },
      render: () => {
        return null;
      },
    });

    app.model({ test: testModel.reducer }, { test: testModel.sagas });

    fetch.mockResponseOnce(JSON.stringify({ age: 30 }));

    app.store.dispatch(testModel.actions.api.getAge());

    expect(handleStart).toHaveBeenCalledTimes(0);
  });

  it('rest api autoLoading and showLoading', done => {
    const testModel = createModel({
      modelName: 'test',
      action: {
        restApi: {
          users: {
            path: '/users',
            autoLoading: true,
            showLoading: true,
          },
        },
      },
      reducer: ({ createReducer }) => {
        return createReducer({}, {
          loading: false,
        });
      },
    });

    const handleStart = jest.fn();

    const app = new App({
      model: {
        basePath: '/api',
        showLoadingOption: {
          onStart: handleStart,
          onEnd: (showLoading) => {
          },
        },
      },
      render: () => {
        return null;
      },
    });

    const testReducer = (state, action) => {
      const newState = testModel.reducer(state, action);

      if (action.type === testModel.actionNames.restApi.users.index.success) {
        expect(state.loading).toEqual(false);
        // 通过执行 done 来判断是否触发了制定的 action
        done();
      }

      return newState;
    };

    app.model({ test: testReducer }, { test: testModel.sagas });

    fetch.mockResponseOnce(JSON.stringify({ age: 30 }));

    app.store.dispatch(testModel.actions.restApi.users.index({}));

    expect(app.store.getState().test.loading).toEqual(true);

    expect(handleStart).toBeCalledWith(true);
  });

  it('model global autoLoading', done => {
    const testModel = createModel({
      modelName: 'test',
      action: {
        api: {
          users: {
            path: '/users',
          },
        },
      },
      reducer: ({ createReducer }) => {
        return createReducer({}, {
          loading: false,
        });
      },
    });

    const restApiModel = createModel({
      modelName: 'restApi',
      action: {
        restApi: {
          books: {
            path: '/books',
          },
        },
      },
      reducer: ({ createReducer }) => {
        return createReducer({}, {
          loading: false,
        });
      },
    });

    const app = new App({
      model: {
        basePath: '/api',
        autoLoading: 'loading',
      },
      render: () => {
        return null;
      },
    });

    const testReducer = (state, action) => {
      const newState = testModel.reducer(state, action);

      if (action.type === testModel.actionNames.api.users.success) {
        expect(state.loading).toEqual(false);
        // 通过执行 done 来判断是否触发了制定的 action
        done();
      }

      return newState;
    };

    app.model(
      { test: testReducer, restApi: restApiModel.reducer },
      { test: testModel.sagas, restApi: restApiModel.sagas },
    );

    fetch.mockResponseOnce(JSON.stringify({ age: 30 }));
    app.store.dispatch(testModel.actions.api.users({}));

    fetch.mockResponseOnce(JSON.stringify({ age: 30 }));
    app.store.dispatch(restApiModel.actions.restApi.books.index({}));

    expect(app.store.getState().test.loading).toEqual(true);
    expect(app.store.getState().restApi.loading).toEqual(true);
  });

  it('model autoLoading cover global autoLoading', () => {
    const testModel = createModel({
      modelName: 'test',
      action: {
        api: {
          users: {
            path: '/users',
            autoLoading: false,
          },
        },
      },
      reducer: ({ createReducer }) => {
        return createReducer({}, {
          loading: false,
        });
      },
    });

    const app = new App({
      model: {
        basePath: '/api',
        autoLoading: 'loading',
      },
      render: () => {
        return null;
      },
    });

    app.model({ test: testModel.reducer }, { test: testModel.sagas });

    fetch.mockResponseOnce(JSON.stringify({ age: 30 }));

    app.store.dispatch(testModel.actions.api.users({}));

    expect(app.store.getState().test.loading).toEqual(false);
  });

  it('set handleError', (done) => {
    const testModel = createModel({
      modelName: 'test',
      action: {
        api: {
          users: {
            path: '/users',
            autoLoading: false,
          },
        },
      },
      reducer: ({ createReducer }) => {
        return createReducer({}, {
          loading: false,
        });
      },
    });

    const app = new App({
      model: {
        basePath: '/api',
        requestErrorHandle: (res) => {
          if (res.payload.res.code !== 200) {
            return res.payload.res;
          }

          return null;
        },
        apiErrorOptions: {
          handleError: (action) => {
            expect(action.payload.error.code).toBe(503);
            done();
          },
        },
      },
      render: () => {
        return null;
      },
    });

    app.model({ test: testModel.reducer }, { test: testModel.sagas });

    fetch.mockResponseOnce(JSON.stringify({ code: 503, age: 30 }));

    app.store.dispatch(testModel.actions.api.users({}));
  });

  it('show message', done => {
    const testModel = createModel({
      modelName: 'test',
      action: {
        api: {
          users: {
            path: '/users',
            message: 'get user success',
          },
        },
      },
      reducer: ({ createReducer }) => {
        return createReducer({}, {
          loading: false,
        });
      },
    });

    const app = new App({
      model: {
        basePath: '/api',
        message: {
          success: (content) => {
            expect(content).toBe('get user success');
            done();
          },
        },
      },
      render: () => {
        return null;
      },
    });

    app.model({ test: testModel.reducer }, { test: testModel.sagas });

    fetch.mockResponseOnce(JSON.stringify({ code: 503, age: 30 }));

    app.store.dispatch(testModel.actions.api.users({}));
  });
});
