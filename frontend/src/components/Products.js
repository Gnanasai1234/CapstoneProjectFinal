import React, { useState, useEffect } from 'react';
import ApiConfig from '../config/api';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    inStock: true
  });
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${ApiConfig.baseURL}/products`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      } else {
        setError('Failed to fetch products');
      }
    } catch (error) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      const url = editingProduct
        ? `${ApiConfig.baseURL}/products/${editingProduct._id}`
        : `${ApiConfig.baseURL}/products`;

      const method = editingProduct ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowForm(false);
        setFormData({ name: '', price: '', description: '', inStock: true });
        setEditingProduct(null);
        fetchProducts();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to save product');
      }
    } catch (error) {
      setError('Network error');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price,
      description: product.description || '',
      inStock: product.inStock
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${ApiConfig.baseURL}/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchProducts();
      } else {
        setError('Failed to delete product');
      }
    } catch (error) {
      setError('Network error');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingProduct(null);
    setFormData({ name: '', price: '', description: '', inStock: true });
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading">Loading products...</div>
      </div>
    );
  }

  const inStockCount = products.filter(p => p.inStock).length;
  const outOfStockCount = products.length - inStockCount;

  return (
    <div>
      {/* Stats Overview */}
      <div className="card">
        <h2>📦 Products</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{products.length}</span>
            <span className="stat-label">Total Products</span>
          </div>
          <div className="stat-card">
            <span className="stat-value" style={{ color: '#16A34A' }}>{inStockCount}</span>
            <span className="stat-label">✓ In Stock</span>
          </div>
          <div className="stat-card">
            <span className="stat-value" style={{ color: '#EF4444' }}>{outOfStockCount}</span>
            <span className="stat-label">✗ Out of Stock</span>
          </div>
        </div>
      </div>

      {/* Actions Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h3>📋 Product Management</h3>
          <button
            className={`button ${showForm ? 'secondary' : 'success'}`}
            onClick={() => showForm ? handleCancel() : setShowForm(true)}
          >
            {showForm ? '✕ Cancel' : '➕ Add Product'}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Product Form */}
        {showForm && (
          <div className="form-container">
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {editingProduct ? '✏️ Edit Product' : '🆕 New Product'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>📦 Product Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Enter product name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>💰 Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>📝 Description</label>
                <textarea
                  className="input"
                  placeholder="Enter product description (optional)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={formData.inStock}
                    onChange={(e) => setFormData({ ...formData, inStock: e.target.checked })}
                    style={{ width: '20px', height: '20px', accentColor: '#16A34A' }}
                  />
                  <span>Available in Stock</span>
                </label>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="button success">
                  {editingProduct ? '💾 Update' : '✓ Create'}
                </button>
                <button type="button" className="button secondary" onClick={handleCancel}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Product List Card */}
      <div className="card">
        <h3>🗂️ All Products ({products.length})</h3>
        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
            <span style={{ fontSize: '4rem', display: 'block', marginBottom: '16px' }}>📦</span>
            <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No products yet</p>
            <p style={{ fontSize: '0.9rem' }}>Create your first product to get started!</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #E0E7FF, #C7D2FE)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem'
                      }}>📦</span>
                      <strong style={{ color: '#0F172A' }}>{product.name}</strong>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      color: '#16A34A',
                      fontWeight: 700,
                      fontSize: '1.1rem'
                    }}>
                      ${product.price.toFixed(2)}
                    </span>
                  </td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {product.description || <span style={{ color: '#CBD5E1' }}>—</span>}
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      background: product.inStock
                        ? 'linear-gradient(135deg, #D1FAE5, #ECFDF5)'
                        : 'linear-gradient(135deg, #FEE2E2, #FEF2F2)',
                      color: product.inStock ? '#166534' : '#991B1B',
                      border: product.inStock ? '1px solid #86EFAC' : '1px solid #FECACA'
                    }}>
                      {product.inStock ? '✓ In Stock' : '✗ Out'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="button secondary"
                        onClick={() => handleEdit(product)}
                        style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="button danger"
                        onClick={() => handleDelete(product._id)}
                        style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                      >
                        🗑️
                      </button>
                    </div>
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

export default Products;
