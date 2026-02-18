const router = require('express').Router();
const Product = require('../models/Product');
const { verifyToken } = require('./auth');

// Get all products
router.get('/', async (req, res) => {
  try {
    const { inStock, search } = req.query;
    const query = {};

    if (inStock !== undefined) {
      query.inStock = inStock === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json({
      products,
      count: products.length,
      environment: process.env.APP_ENVIRONMENT || 'blue'
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ product });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Error fetching product', error: error.message });
  }
});

// Create product (protected route)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, price, description, inStock } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ message: 'Name and price are required' });
    }

    const product = new Product({
      name,
      price: parseFloat(price),
      description: description || '',
      inStock: inStock !== undefined ? inStock : true,
      environment: process.env.APP_ENVIRONMENT || 'blue'
    });

    await product.save();

    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Error creating product', error: error.message });
  }
});

// Update product (protected route)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { name, price, description, inStock } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (name) product.name = name;
    if (price !== undefined) product.price = parseFloat(price);
    if (description !== undefined) product.description = description;
    if (inStock !== undefined) product.inStock = inStock;

    await product.save();

    res.json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Error updating product', error: error.message });
  }
});

// Delete product (protected route)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Error deleting product', error: error.message });
  }
});

module.exports = router;

