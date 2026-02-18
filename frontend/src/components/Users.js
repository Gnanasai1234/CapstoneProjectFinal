import React, { useState, useEffect } from 'react';
import ApiConfig from '../config/api';

const Users = ({ activeEnv }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currentEnv = activeEnv || 'loading';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${ApiConfig.baseURL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        setError('Failed to fetch users');
      }
    } catch (error) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${ApiConfig.baseURL}/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchUsers();
      } else {
        setError('Failed to delete user');
      }
    } catch (error) {
      setError('Network error');
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading">Loading users...</div>
      </div>
    );
  }

  const envColor = currentEnv === 'blue' ? '#2563EB' : '#16A34A';

  return (
    <div>
      {/* Stats Overview */}
      <div className="card">
        <h2>👥 Users</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{users.length}</span>
            <span className="stat-label">Total Users</span>
          </div>
          <div className="stat-card">
            <span className="stat-value" style={{ color: envColor }}>
              {currentEnv === 'blue' ? '🔵' : '🟢'}
            </span>
            <span className="stat-label">
              Active: {currentEnv.charAt(0).toUpperCase() + currentEnv.slice(1)} Environment
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-value" style={{ color: '#16A34A' }}>✓</span>
            <span className="stat-label">Connected</span>
          </div>
        </div>
      </div>

      {/* User List Card */}
      <div className="card">
        <h3>📋 All Users ({users.length})</h3>

        {error && <div className="error-message">{error}</div>}

        {users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
            <span style={{ fontSize: '4rem', display: 'block', marginBottom: '16px' }}>👤</span>
            <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No users found</p>
            <p style={{ fontSize: '0.9rem' }}>Users will appear here once registered.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Environment</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: currentEnv === 'blue'
                          ? 'linear-gradient(135deg, #2563EB, #4F46E5)'
                          : 'linear-gradient(135deg, #16A34A, #059669)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        boxShadow: currentEnv === 'blue'
                          ? '0 4px 12px rgba(37, 99, 235, 0.3)'
                          : '0 4px 12px rgba(22, 163, 74, 0.3)'
                      }}>
                        {user.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                      <div>
                        <strong style={{ color: '#0F172A', display: 'block' }}>{user.name}</strong>
                        <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Active User</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ color: '#475569' }}>{user.email}</span>
                  </td>
                  <td>
                    <span
                      className={`environment-badge ${currentEnv === 'blue' ? 'blue' : 'green'}`}
                      style={{ fontSize: '0.75rem' }}
                    >
                      {currentEnv === 'blue' ? '🔵' : '🟢'} {currentEnv}
                    </span>
                  </td>
                  <td>
                    <div>
                      <span style={{ color: '#475569', display: 'block' }}>
                        {new Date(user.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                        {new Date(user.createdAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </td>
                  <td>
                    <button
                      className="button danger"
                      onClick={() => handleDelete(user._id)}
                      style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Users;
