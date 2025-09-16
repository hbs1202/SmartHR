/**
 * 애플리케이션 진입점
 * @description React 애플리케이션의 메인 진입점 및 Provider 설정
 * @author SmartHR Team
 * @date 2024-09-16
 */

import '@ant-design/v5-patch-for-react-19';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store/index';
import App from './App';
import './index.css';

const root = createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
