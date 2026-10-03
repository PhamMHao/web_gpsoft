import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* P0.1 — URL thật cho website: Router bao ngoài AppProvider để dùng useLocation/useNavigate */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
