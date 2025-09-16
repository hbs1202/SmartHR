/**
 * UI 상태 관리 Slice
 * @description 전역 UI 상태 관리 (로딩, 알림, 모달 등)
 * @author SmartHR Team
 * @date 2024-09-16
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

// 알림 타입
export interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
}

// UI 상태 인터페이스
interface UIState {
  // 전역 로딩 상태
  isGlobalLoading: boolean;
  globalLoadingMessage?: string;

  // 사이드바 상태
  sidebarCollapsed: boolean;

  // 알림 목록
  notifications: Notification[];

  // 모달 상태
  modals: {
    [key: string]: boolean;
  };

  // 테마 설정
  theme: 'light' | 'dark';

  // 언어 설정
  locale: 'ko' | 'en';
}

// 초기 상태
const initialState: UIState = {
  isGlobalLoading: false,
  globalLoadingMessage: undefined,
  sidebarCollapsed: false,
  notifications: [],
  modals: {},
  theme: 'light',
  locale: 'ko',
};

// UI Slice 생성
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // 전역 로딩 상태 설정
    setGlobalLoading: (state, action: PayloadAction<{ loading: boolean; message?: string }>) => {
      state.isGlobalLoading = action.payload.loading;
      state.globalLoadingMessage = action.payload.message;
    },

    // 사이드바 토글
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },

    // 사이드바 상태 설정
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },

    // 알림 추가
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      };
      state.notifications.push(notification);
    },

    // 알림 제거
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        notification => notification.id !== action.payload
      );
    },

    // 모든 알림 제거
    clearNotifications: (state) => {
      state.notifications = [];
    },

    // 모달 상태 설정
    setModalOpen: (state, action: PayloadAction<{ modalId: string; open: boolean }>) => {
      state.modals[action.payload.modalId] = action.payload.open;
    },

    // 모달 토글
    toggleModal: (state, action: PayloadAction<string>) => {
      const modalId = action.payload;
      state.modals[modalId] = !state.modals[modalId];
    },

    // 테마 변경
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },

    // 언어 변경
    setLocale: (state, action: PayloadAction<'ko' | 'en'>) => {
      state.locale = action.payload;
    },

    // UI 상태 리셋
    resetUI: (state) => {
      state.isGlobalLoading = false;
      state.globalLoadingMessage = undefined;
      state.notifications = [];
      state.modals = {};
    },
  },
});

// 액션 export
export const {
  setGlobalLoading,
  toggleSidebar,
  setSidebarCollapsed,
  addNotification,
  removeNotification,
  clearNotifications,
  setModalOpen,
  toggleModal,
  setTheme,
  setLocale,
  resetUI,
} = uiSlice.actions;

// 편의 액션 생성자들
export const showSuccessNotification = (title: string, message?: string, duration?: number) =>
  addNotification({ type: 'success', title, message, duration });

export const showErrorNotification = (title: string, message?: string, duration?: number) =>
  addNotification({ type: 'error', title, message, duration });

export const showWarningNotification = (title: string, message?: string, duration?: number) =>
  addNotification({ type: 'warning', title, message, duration });

export const showInfoNotification = (title: string, message?: string, duration?: number) =>
  addNotification({ type: 'info', title, message, duration });

// Selectors
export const selectUI = (state: { ui: UIState }) => state.ui;
export const selectIsGlobalLoading = (state: { ui: UIState }) => state.ui.isGlobalLoading;
export const selectGlobalLoadingMessage = (state: { ui: UIState }) => state.ui.globalLoadingMessage;
export const selectSidebarCollapsed = (state: { ui: UIState }) => state.ui.sidebarCollapsed;
export const selectNotifications = (state: { ui: UIState }) => state.ui.notifications;
export const selectModalOpen = (modalId: string) => (state: { ui: UIState }) =>
  state.ui.modals[modalId] || false;
export const selectTheme = (state: { ui: UIState }) => state.ui.theme;
export const selectLocale = (state: { ui: UIState }) => state.ui.locale;

// Reducer export
export default uiSlice.reducer;