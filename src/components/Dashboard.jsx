import { format } from 'date-fns';
import { User, Award, Calendar, Clock } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

function Dashboard({ user }) {
  if (!user) return <LoadingSpinner />;

  const expirationDate = new Date(user.expiration);
  const daysLeft = Math.ceil((expirationDate - new Date()) / (1000 * 60 * 60 * 24));
  const isPremium = user.type === 'premium';

  return (
    <div className="dashboard">
      <header className="page-header flex-between">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">Welcome back, {user.username}</p>
        </div>
      </header>

      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-icon user">
            <User size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Account Type</span>
            <span className={`stat-value ${isPremium ? 'premium-text' : ''}`}>
              {user.type.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon points">
            <Award size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Fidelity Points</span>
            <span className="stat-value">{user.points}</span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon days">
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Days Left</span>
            <span className={`stat-value ${daysLeft < 7 ? 'warning-text' : 'success-text'}`}>
              {daysLeft} Days
            </span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon date">
            <Calendar size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Expiration</span>
            <span className="stat-value text-sm">
              {format(expirationDate, 'PPP')}
            </span>
          </div>
        </div>
      </div>

      {/* Additional user info or recent activity could go here */}

      <style>{`
        /* page-header styles handled globally */
        
        .subtitle {
          color: var(--text-secondary);
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
        }
        
        .stat-card {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .stat-icon.user { background-color: rgba(56, 189, 248, 0.1); color: var(--accent-primary); }
        .stat-icon.points { background-color: rgba(234, 179, 8, 0.1); color: var(--warning); }
        .stat-icon.days { background-color: rgba(34, 197, 94, 0.1); color: var(--success); }
        .stat-icon.date { background-color: rgba(148, 163, 184, 0.1); color: var(--text-secondary); }
        
        .stat-info {
          display: flex;
          flex-direction: column;
        }
        
        .stat-label {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }
        
        .stat-value {
          font-size: 1.25rem;
          font-weight: 600;
        }
        
        .text-sm { font-size: 1rem; }
        
        .premium-text {
          background: linear-gradient(to right, #38bdf8, #818cf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .warning-text { color: var(--warning); }
        .success-text { color: var(--success); }
      `}</style>
    </div>
  );
}

export default Dashboard;
