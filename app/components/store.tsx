// store.tsx
import { configureStore } from '@reduxjs/toolkit';
import userReducer from '../reducers/userReducers';

const store = configureStore({
  reducer: {
    user: userReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;
