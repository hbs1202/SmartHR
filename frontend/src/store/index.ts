/**
 * Redux Store 설정
 * @description RTK(Redux Toolkit)를 이용한 전역 상태 관리 스토어
 * @author SmartHR Team
 * @date 2024-09-16
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';

// Redux Store 생성
export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
  devTools: import.meta.env.DEV, // 개발 환경에서만 DevTools 활성화
});

// TypeScript 타입 정의
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// 타입이 지정된 hooks
export { useAppDispatch, useAppSelector } from './hooks';