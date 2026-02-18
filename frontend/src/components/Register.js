import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ApiConfig from '../config/api';

const Register = ({ onRegister, activeEnv }) => {
  const [formData, setFormData] = useState({
    name: '',
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
      const response = await fetch(`${ApiConfig.baseURL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        onRegister(data.token, data.user);
      } else {
        setError(data.message || 'Registration failed');
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
          }}>✨</span>
          <h2 style={{ margin: 0 }}>Create Account</h2>
          <p style={{ color: '#64748B', marginTop: '8px' }}>
            Join the Blue-Green Deployment platform
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>👤 Full Name</label>
            <input
              type="text"
              name="name"
              className="input"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
              required
              autoComplete="name"
            />
          </div>
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
              placeholder="Min 6 characters"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="6"
              autoComplete="new-password"
            />
            <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '4px' }}>
              Must be at least 6 characters
            </p>
          </div>
          <button
            type="submit"
            className="button success"
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
                Creating account...
              </span>
            ) : (
              <>✨ Create Account</>
            )}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <Link to="/login">Sign in</Link>
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

export default Register;
