import App from '../../app';
import * as React from 'react';
import useModel from '../useModel';
import createModel from '../../model';

jest.useFakeTimers();

export interface HomeState {
  count: number;
}

const counterModel = createModel({
  modelName: 'counter',
  action: {
    simple: {
      addCount: 'addCount',
    },
    api: {},
  },
  reducer: ({ simpleActionNames, createReducer }) => {
    return createReducer<HomeState>({
      [simpleActionNames.addCount](state, action) {
        return {
          ...state,
          count: state.count + 1,
        };
      },
    }, {
      count: 1,
    });
  },
  sagas: () => {
    return [];
  },
});

export interface CounterProps {
}

export default function Counter (props: CounterProps) {
  const [ counter, dispatch ] = useModel<HomeState, typeof counterModel.actions>('counter');
  return (
    <div>
      <p id="count">{counter.count}</p>
      <button id="addBtn" onClick={() => { dispatch(counterModel.actions.simple.addCount()); }}>add count</button>
    </div>
  );
}

describe('useModel', () => {
  beforeEach(() => {
  });
  it('get model state', () => {
    const app = new App({
      render: () => (
        <Counter />
      ),
    });
    app.model({ counter: counterModel.reducer }, { counter: counterModel.sagas });
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
    app.start('root');

    const content = document.getElementById('count');
    expect(content.innerHTML).toBe('1');
    const addBtn = document.getElementById('addBtn');
    addBtn.click();
    expect(content.innerHTML).toBe('2');
  });
});
