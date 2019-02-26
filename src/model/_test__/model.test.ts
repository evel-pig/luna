import createModel from '../index';
import App from '../../app';

declare const fetch: any;

jest.useFakeTimers();

interface TestModelState {
  loading: boolean;
  age: number;
  error: boolean;
}

function getModel() {
  const restApiConfigs = {
    users: {
      path: 'users',
    },
  };

  const testModel = createModel({
    modelName: 'test',
    action: {
      simple: {
        add: 'add',
      },
      api: {
        getList: {
          path: 'getList',
        },
        getAge: {
          path: 'getAge',
          autoLoading: true,
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

    app.model({ test: testReducer }, { test: testModel.sagas });

    fetch.mockResponseOnce(JSON.stringify({ age: 30 }));

    app.store.dispatch(testModel.actions.api.getAge({}));

    expect(app.store.getState().test.loading).toEqual(true);
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
});