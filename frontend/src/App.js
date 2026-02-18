import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import './index.css';
import ApiConfig from './config/api';
import HealthMonitor from './services/healthMonitor';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Users from './components/Users';

/* Navigation Component with Active State */
const NavBar = ({ onLogout }) => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="nav-bar">
      <div className="nav-links">
        <Link
          to="/dashboard"
          className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
        >
          <span>📊</span> Dashboard
        </Link>
        <Link
          to="/products"
          className={`nav-link ${isActive('/products') ? 'active' : ''}`}
        >
          <span>📦</span> Products
        </Link>
        <Link
          to="/users"
          className={`nav-link ${isActive('/users') ? 'active' : ''}`}
        >
          <span>👥</span> Users
        </Link>
      </div>
      <button onClick={onLogout} className="button secondary">
        <span>🚪</span> Logout
      </button>
    </nav>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [healthStatus, setHealthStatus] = useState({ blue: { healthy: false }, green: { healthy: false } });
  const [activeEnv, setActiveEnv] = useState(null); // Dynamic — fetched from backend

  // Fetch active environment from the backend (single source of truth)
  const pollEnvironment = useCallback(async () => {
    const env = await ApiConfig.fetchActiveEnvironment();
    setActiveEnv(env);
  }, []);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      fetchUser();
    }

    // Fetch active environment immediately
    pollEnvironment();

    // Poll every 10 seconds so traffic switches reflect without reload
    const envPollId = setInterval(pollEnvironment, 10000);

    // Start health monitoring
    HealthMonitor.startMonitoring();

    // Listen for health status updates
    const handleHealthUpdate = (event) => {
      if (event.detail && event.detail.blue && event.detail.green) {
        setHealthStatus(event.detail);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('healthStatusUpdate', handleHealthUpdate);
    }

    // Initial health check
    HealthMonitor.checkBothEnvironments().then((status) => {
      if (status) {
        setHealthStatus(status);
      }
    }).catch((error) => {
      console.error('Error in initial health check:', error);
    });

    return () => {
      clearInterval(envPollId);
      HealthMonitor.stopMonitoring();
      if (typeof window !== 'undefined') {
        window.removeEventListener('healthStatusUpdate', handleHealthUpdate);
      }
    };
  }, [pollEnvironment]);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${ApiConfig.baseURL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      localStorage.removeItem('token');
      setIsAuthenticated(false);
    }
  };

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
    setIsAuthenticated(true);
    // Re-fetch environment after login (ensures fresh state)
    pollEnvironment();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  // Derive display values from backend-driven activeEnv
  const currentEnv = activeEnv || 'loading';
  const envColor = currentEnv === 'blue' ? 'blue' : 'green';

  return (
    <Router>
      <div className="container">
        {/* Enhanced Header with Environment Status */}
        <div className="header">
          <h1>
            <span style={{ fontSize: '1.5em' }}>🚀</span>
            Blue-Green Deployment
            <span className={`environment-badge ${envColor}`}>
              {currentEnv === 'blue' ? '🔵' : '🟢'} {currentEnv}
            </span>
            <span className="live-indicator">LIVE</span>
          </h1>

          {/* Health Status Cards */}
          <div className="health-status">
            <div className={`health-item ${healthStatus?.blue?.healthy ? 'healthy' : 'unhealthy'}`}>
              <h3>🔵 Blue Environment</h3>
              <p>
                <strong>Status:</strong> {healthStatus?.blue?.healthy ? '✓ Healthy' : '✗ Unhealthy'}
              </p>
              {healthStatus?.blue?.lastChecked && (
                <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                  🕐 {new Date(healthStatus.blue.lastChecked).toLocaleTimeString()}
                </p>
              )}
            </div>
            <div className={`health-item ${healthStatus?.green?.healthy ? 'healthy' : 'unhealthy'}`}>
              <h3>🟢 Green Environment</h3>
              <p>
                <strong>Status:</strong> {healthStatus?.green?.healthy ? '✓ Healthy' : '✗ Unhealthy'}
              </p>
              {healthStatus?.green?.lastChecked && (
                <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                  🕐 {new Date(healthStatus.green.lastChecked).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Bar */}
        {isAuthenticated && <NavBar onLogout={handleLogout} />}

        {/* Routes */}
        <Routes>
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" />
              ) : (
                <Login onLogin={handleLogin} activeEnv={currentEnv} />
              )
            }
          />
          <Route
            path="/register"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" />
              ) : (
                <Register onRegister={handleLogin} activeEnv={currentEnv} />
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              isAuthenticated ? (
                <Dashboard user={user} activeEnv={currentEnv} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/products"
            element={
              isAuthenticated ? (
                <Products />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/users"
            element={
              isAuthenticated ? (
                <Users activeEnv={currentEnv} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>

        {/* Footer */}
        <footer style={{
          textAlign: 'center',
          padding: '24px',
          marginTop: '48px',
          color: '#64748B',
          fontSize: '0.875rem',
          borderTop: '1px solid #E2E8F0'
        }}>
          <p>🚀 Blue-Green Deployment Framework • Built with React</p>
          <p style={{ marginTop: '8px', opacity: 0.7 }}>
            Environment: <strong style={{ color: currentEnv === 'blue' ? '#2563EB' : '#16A34A' }}>{currentEnv}</strong>
          </p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
