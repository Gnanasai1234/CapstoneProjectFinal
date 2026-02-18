import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ApiConfig from '../config/api';

const Login = ({ onLogin, activeEnv }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const currentEnv = activeEnv || 'loading';

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${ApiConfig.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data.token, data.user);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="card">
        {/* Logo/Icon */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <span style={{
            fontSize: '4rem',
            display: 'block',
            marginBottom: '8px'
          }}>🚀</span>
          <h2 style={{ margin: 0 }}>Welcome Back</h2>
          <p style={{ color: '#64748B', marginTop: '8px' }}>
            Sign in to your account
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>📧 Email Address</label>
            <input
              type="email"
              name="email"
              className="input"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label>🔑 Password</label>
            <input
              type="password"
              name="password"
              className="input"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            className="button"
            disabled={loading}
            style={{ marginTop: '8px' }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '18px',
                  height: '18px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }}></span>
                Signing in...
              </span>
            ) : (
              <>🚀 Sign In</>
            )}
          </button>
        </form>

        <p className="auth-link">
          Don't have an account? <Link to="/register">Create one</Link>
        </p>

        {/* Environment Badge — driven by backend */}
        <div style={{
          textAlign: 'center',
          marginTop: '24px',
          paddingTop: '24px',
          borderTop: '1px solid #E2E8F0'
        }}>
          <span className={`environment-badge ${currentEnv}`} style={{ fontSize: '0.7rem' }}>
            {currentEnv === 'blue' ? '🔵' : '🟢'} {currentEnv} environment
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
