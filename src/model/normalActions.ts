import { createAction } from 'redux-actions';

const redirect = createAction<any>('LUNA_REDIRECT') as any;
const apiSuccess = createAction<any>('LUNA_API_SUCCESS') as any;

export default {
  redirect,
  apiSuccess: apiSuccess,
};
