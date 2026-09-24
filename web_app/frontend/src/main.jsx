import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import ErrorBoundary from './ErrorBoundary.jsx'

let isReloading = false;
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  const url = typeof resource === 'string' ? resource : (resource ? resource.url : '');
  
  if (url && url.includes('/api/')) {
    const token = localStorage.getItem('tls1_token');
    config = config || {};
    config.headers = {
      ...config.headers
    };
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await originalFetch(resource, config);
    if (response.status === 401) {
      if (token) {
        localStorage.removeItem("tls1_token");
      }
    }
    return response;
  }
  return originalFetch(...args);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
