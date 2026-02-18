import React from 'react';
import { Link } from 'react-router-dom';
import ApiConfig from '../config/api';

const Dashboard = ({ user, activeEnv }) => {
  const currentEnv = activeEnv || 'loading';
  const envColor = currentEnv === 'blue' ? '#2563EB' : '#16A34A';

  return (
    <div>
      {/* Welcome Card */}
      <div className="card">
        <h2>📊 Dashboard</h2>

        <div className="info-card" style={{ marginTop: '16px' }}>
          <div className="icon">👋</div>
          <div className="content">
            <strong>Welcome back, {user?.name || 'User'}!</strong>
            <span>You're connected to the {currentEnv} environment</span>
          </div>
        </div>
      </div>

      {/* Environment Status */}
      <div className="card">
        <h3>🌐 Environment Status</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value" style={{
              background: `linear-gradient(135deg, ${envColor}, ${currentEnv === 'blue' ? '#4F46E5' : '#059669'})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {currentEnv === 'blue' ? '🔵' : '🟢'}
            </span>
            <span className="stat-label">Active Environment</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">✓</span>
            <span className="stat-label">Connected</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">🔒</span>
            <span className="stat-label">Secure</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">⚡</span>
            <span className="stat-label">Real-time</span>
          </div>
        </div>
      </div>

      {/* User Info Card */}
      <div className="card">
        <h3>👤 Account Details</h3>
        <div style={{ marginTop: '16px' }}>
          <div className="info-card">
            <div className="icon">👤</div>
            <div className="content">
              <strong>Name</strong>
              <span>{user?.name || 'Not available'}</span>
            </div>
          </div>
          <div className="info-card">
            <div className="icon">📧</div>
            <div className="content">
              <strong>Email</strong>
              <span>{user?.email || 'Not available'}</span>
            </div>
          </div>
          <div className="info-card">
            <div className="icon">🌐</div>
            <div className="content">
              <strong>API Endpoint</strong>
              <span><code>{ApiConfig.baseURL}</code></span>
            </div>
          </div>
          <div className="info-card">
            <div className="icon" style={{ background: currentEnv === 'blue' ? '#DBEAFE' : '#DCFCE7' }}>
              {currentEnv === 'blue' ? '🔵' : '🟢'}
            </div>
            <div className="content">
              <strong>Environment</strong>
              <span style={{
                color: envColor,
                fontWeight: 600,
                textTransform: 'uppercase'
              }}>{currentEnv}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Card */}
      <div className="card">
        <h3>⚡ Quick Actions</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginTop: '16px'
        }}>
          <Link to="/products" style={{ textDecoration: 'none' }}>
            <div className="stat-card" style={{ cursor: 'pointer' }}>
              <span style={{ fontSize: '2rem' }}>📦</span>
              <span className="stat-label">Manage Products</span>
            </div>
          </Link>
          <Link to="/users" style={{ textDecoration: 'none' }}>
            <div className="stat-card" style={{ cursor: 'pointer' }}>
              <span style={{ fontSize: '2rem' }}>👥</span>
              <span className="stat-label">View Users</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
