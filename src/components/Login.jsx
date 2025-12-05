import { useState } from 'react';
import { Key, Clipboard, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../context/ToastContext';

function Login({ onLogin }) {
  const { addToast } = useToast();
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Please enter a valid token');
      return;
    }
    onLogin(token.trim());
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setToken(text);
      addToast('Pasted from clipboard', 'info');
    } catch (err) {
      console.error('Failed to read clipboard', err);
      addToast('Failed to read clipboard', 'error');
    }
  };

  return (
    <div className="login-container">
      <div className="logo-container">
        <img src="/logo.png" alt="Robofuse Logo" className="app-logo" />
      </div>
      <div className="card login-card animate-fade-in">
        <div className="login-header">
          <h1 className="text-gradient">connect to robofuse</h1>
          <p>Link your Real Debrid account</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <input
              type={showToken ? 'text' : 'password'}
              className="input"
              placeholder="API Token"
              style={{ fontSize: '1rem', paddingRight: '2.5rem' }}
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <button
              type="button"
              className="btn-icon toggle-visibility"
              onClick={() => setShowToken(!showToken)}
              title={showToken ? "Hide token" : "Show token"}
            >
              {showToken ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            <button type="button" className="btn-icon paste-btn" onClick={handlePaste} title="Paste from clipboard">
              <Clipboard size={20} />
            </button>
          </div>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="btn btn-primary full-width btn-glow">
            Link Account
          </button>
        </form>

        <div className="login-footer">
          <p>Don't have a token?</p>
          <a href="https://real-debrid.com/apitoken" target="_blank" rel="noreferrer">
            Get it here
          </a>
        </div>
      </div>

      <style>{`
        .login-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 1rem;
          gap: 1.5rem; /* Compact gap */
        }
        
        .login-card {
          width: 100%;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          gap: 2rem;
          background: rgba(30, 41, 59, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          padding: 2rem;
          gap: 1.5rem; /* Compact gap */
        }
        
        .login-header {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          align-items: center;
          gap: 0.25rem; /* Very tight lockup */
        }
        
        .logo-container {
          display: flex;
          justify-content: center;
          /* Removed margin-bottom as gap handles it now */
        }

        .app-logo {
          height: 96px;
          width: auto;
          object-fit: contain;
          filter: invert(1);
          mix-blend-mode: screen;
        }
        
        .login-header h1 {
          font-size: 2rem;
          font-weight: 700;
          margin: 0;
        }
        
        .login-header p {
          color: var(--text-secondary);
          font-size: 0.95rem;
        }
        
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 0.75rem; /* Compact form gap */
        }
        
        .input-group {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .toggle-visibility {
          position: absolute;
          right: 3.5rem; /* Positioned before the paste button */
          color: var(--text-secondary);
        }
        
        .paste-btn {
          color: var(--accent-primary);
        }
        
                /* Icon button styles moved to global index.css */

.btn-icon:focus {
    outline: none;
}        
        .full-width {
          width: 100%;
          padding: 0.75rem;
        }
        
        .error-text {
          color: var(--danger);
          font-size: 0.875rem;
          text-align: center;
        }
        
        .login-footer {
          text-align: center;
          font-size: 0.875rem;
          color: var(--text-secondary);
          display: flex;
          gap: 0.5rem;
          justify-content: center;
        }
        .btn-glow {
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-hover));
          box-shadow: 0 4px 12px rgba(14, 165, 233, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-weight: 600;
          letter-spacing: 0.025em;
          padding: 1rem;
          font-size: 1rem;
        }

        .btn-glow:hover {
          box-shadow: 0 6px 16px rgba(14, 165, 233, 0.4);
          transform: translateY(-1px);
        }

        .btn-glow:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}

export default Login;
