# @epig/luna

> 基于redux和redux-saga的数据流框架

## API

### App

创建应用

```typescript

import App from '@dfxk/luna';

const app = new App({
  render: () => {
    return 'Hello world';
  },
});

app.start('#root');

```

### model

创建model

```typescript

import createModel from '@dfxk/luna/model';

export interface UsersState {
  loading: boolean;
}

const model = createModel({
  modelName: 'users',
  action: {
    simple: {},
    api: {
      users: {
        path: '/system/users',
      },
    },
  },
  reducer: ({ apiActionNames, createReducer }) => {
    return createReducer<UsersState, any>({
      [apiActionNames.users.request](state, action) {
        return {
          ...state,
          loading: true,
        };
      },
      [apiActionNames.users.success](state, action) {
        return {
          ...state,
          loading: false,
        };
      },
      [apiActionNames.users.error](state, action) {
        return {
          ...state,
          loading: false,
        };
      },
    }, {
      loading: false,
    });
  },
  sagas: () => {
    return [];
  },
});

export default model;

```

### connect

给组件注入model

```typescript

class App extends React.Component {}

/** 注入已加载model */
export default connect({
  /** data: 属性名称, user: model名称 */
  data: 'user',
})(App);

/** 注入异步model */
export default connect({
  /** data: 属性名称, user: model名称 */
  data: require('models/user'),
})(App);

```

### useModel

给组件注入model的Hooks版本

```typescript
export interface CounterProps {
}

export default function Counter (props: CounterProps) {
  const [ home, dispatch, homeActions ] = useModel<HomeState, typeof homeModel.actions>(require('./model'));
  return (
    <div>
      <p>{home.count}</p>
      <button onClick={() => { dispatch(homeActions.simple.addCount()); }}>add count</button>
    </div>
  );
}

```

### DynamicComponent

异步加载组件

```typescript

import DynamicComponent from '@dfxk/luna/DynamicComponent';

class App extends React.Component {
  render() {
    return (
      <DynamicComponent
        model={{
          component: require('containers/User'),
        }}
      />
    );
  }
}

```
