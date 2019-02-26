import { createAction } from 'redux-actions';

const redirect = createAction<any>('LUNA_REDIRECT') as any;

export default {
  redirect,
};
