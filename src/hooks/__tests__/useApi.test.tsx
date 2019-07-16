import * as React from 'react';
import useApi from '../useApi';
import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import App from '../../app';
import { renderHook } from '@testing-library/react-hooks';

configure({ adapter: new Adapter() });

declare const fetch: any;

let container;

function User() {
  useApi({
    path: '/getUser',
  }, {
    message: 'get user success',
  });
  return (
    <div></div>
  );
}

describe('useApi', () => {
  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'root';
    document.body.appendChild(container);
    fetch.resetMocks();
  });
  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });
  it('get request success', async () => {
    const app = new App({
      render: () => (
        <div></div>
      ),
      model: {
        processRes: res => res.data,
      },
    });
    app.start('root');
    fetch.mockResponseOnce(JSON.stringify({ code: 200, data: { name: 'mary' } }));
    const { result, waitForNextUpdate } = renderHook(
      () => useApi({ path: '/getSimpleUser' }),
    );
    await waitForNextUpdate();
    expect(result.current.data.name).toBe('mary');
  });
  it('get request error', async (done) => {
    const app = new App({
      render: () => (
        <User />
      ),
      model: {
        requestErrorHandle: (res) => {
          if (res.payload.res.code !== 200) {
            return res.payload.res;
          }

          return null;
        },
        processRes: res => res.data,
        apiErrorOptions: {
          handleError: (action) => {
            expect(action.payload.error.code === 502);
            done();
          },
        },
      },
    });
    app.start('root');
    fetch.mockResponseOnce(JSON.stringify({ code: 502, data: { name: 'mary' } }));
  });
  it('show message after request success', done => {
    const app = new App({
      render: () => (
        <User />
      ),
      model: {
        processRes: res => res.data,
        message: {
          success: (content) => {
            expect(content).toBe('get user success');
            done();
          },
        },
      },
    });
    app.start('root');
    fetch.mockResponseOnce(JSON.stringify({ code: 200, data: { name: 'mary' } }));
  });
});
