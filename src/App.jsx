import { useState, useEffect } from 'react';
import { rdClient } from './services/realDebrid';
import { Home, Download, HardDrive, Key, LogOut } from 'lucide-react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';
import './index.css';

// Components (Placeholders for now)
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Torrents from './components/Torrents';
import Downloads from './components/Downloads';

import { ToastProvider } from './context/ToastContext';

function App() {
  return (
    <ToastProvider>
      <AppContent />
      <SpeedInsights />
      <Analytics />
    </ToastProvider>
  );
}

function AppContent() {
  const [token, setToken] = useState(rdClient.getToken());
  const [activeTab, setActiveTabState] = useState(localStorage.getItem('activeTab') || 'dashboard');

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    localStorage.setItem('activeTab', tab);
  };
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (token) {
      rdClient.setToken(token);
      loadUser();
    }
  }, [token]);

  const loadUser = async () => {
    try {
      const userData = await rdClient.getUserInfo();
      setUser(userData);
    } catch (error) {
      console.error('Failed to load user', error);
      if (error.message === 'Invalid Token') {
        handleLogout();
      }
    }
  };

  const handleLogin = (newToken) => {
    setToken(newToken);
    rdClient.setToken(newToken);
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      setToken(null);
      localStorage.removeItem('rd_token');
      setUser(null);
    }
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      <nav className="mobile-nav">
        <button
          className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <Home size={24} />
          <span>Home</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'torrents' ? 'active' : ''}`}
          onClick={() => setActiveTab('torrents')}
        >
          <HardDrive size={24} />
          <span>Torrents</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'downloads' ? 'active' : ''}`}
          onClick={() => setActiveTab('downloads')}
        >
          <Download size={24} />
          <span>Downloads</span>
        </button>
        <button
          className="nav-item"
          onClick={handleLogout}
        >
          <LogOut size={24} />
          <span>Logout</span>
        </button>
      </nav>

      <main className="main-content container animate-fade-in">
        {activeTab === 'dashboard' && <Dashboard user={user} />}
        {activeTab === 'torrents' && <Torrents />}
        {activeTab === 'downloads' && <Downloads />}
      </main>

      <style>{`
        .app-container {
          padding-bottom: 80px; /* Space for mobile nav */
        }
        
        .mobile-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background-color: var(--bg-secondary);
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: space-around;
          padding: 0.75rem;
          z-index: 50;
          backdrop-filter: blur(10px);
          background-color: rgba(30, 41, 59, 0.9);
        }
        
        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          color: var(--text-secondary);
          background: none;
          font-size: 0.75rem;
        }
        
        .nav-item.active {
          color: var(--accent-primary);
        }
        
        .main-content {
          padding-top: 2rem;
        }

        @media (min-width: 768px) {
          .app-container {
            padding-bottom: 0;
            display: flex;
          }
          
          .mobile-nav {
            position: sticky;
            top: 0;
            height: 100vh;
            width: 80px;
            flex-direction: column;
            justify-content: flex-start;
            gap: 2rem;
            padding-top: 2rem;
            border-top: none;
            border-right: 1px solid var(--border-color);
          }
          
          .main-content {
            flex: 1;
            padding: 2rem;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
