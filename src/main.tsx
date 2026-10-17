import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  try {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  } catch (err) {
    console.error("LocoHelp Root Mount Exception:", err);
    rootElement.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0f172a; color: white; font-family: sans-serif; text-align: center; padding: 20px;">
        <div>
          <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 8px;">LOCOHELP</h2>
          <p style="font-size: 13px; color: #94a3b8; margin-bottom: 16px;">Loading session data...</p>
          <button onclick="localStorage.clear(); window.location.reload();" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">
            Reset Cache & Reload
          </button>
        </div>
      </div>
    `;
  }
}
