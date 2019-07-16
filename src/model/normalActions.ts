import { createAction } from 'redux-actions';

const redirect = createAction<any>('LUNA_REDIRECT') as any;
const apiComplete = createAction<any>('LUNA_API_COMPLETE') as any;

export default {
  redirect,
  apiComplete: apiComplete,
};
