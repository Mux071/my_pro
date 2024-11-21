import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import mongoose from 'mongoose';
import upload from './uploads/uploadMiddleware.js';
import path from 'path';
import { fileURLToPath } from 'url';
import Product from './models/Product.js';
import cloudinary from './cloudinaryConfig.js'; // Import Cloudinary configuration

const app = express();
const port = 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(bodyParser.json());
app.use(cors());

const adminCredentials = { username: 'admin', password: 'password' };

// Ensure MongoDB connection is correctly established
mongoose.connect('mongodb://localhost:27017/products')
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  });

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === adminCredentials.username && password === adminCredentials.password) {
    res.status(200).send({ message: 'Login successful' });
  } else {
    res.status(401).send({ message: 'Invalid credentials' });
  }
});

app.post('/products', upload.single('image'), async (req, res) => {
  try {
    const { name, description, category, subcategory } = req.body;
    console.log('Received product data:', { name, description, category, subcategory });
    if (req.file) {
      console.log('Uploading file to Cloudinary:', req.file.path);
      const result = await cloudinary.uploader.upload(req.file.path);
      console.log('Cloudinary upload result:', result);
      const newProduct = new Product({
        name,
        description,
        category,
        subcategory,
        imageUrl: result.secure_url
      });
      await newProduct.save();
      res.status(201).send(newProduct);
    } else {
      res.status(400).send({ message: 'Image file is required' });
    }
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).send({ message: 'Error creating product', error });
  }
});

app.get('/products', async (req, res) => {
  try {
    const { search, category, subcategory } = req.query;
    let query = {};

    if (search) {
      query.name = { $regex: search, $options: 'i' }; // Case-insensitive search
    }
    if (category) {
      query.category = category;
    }
    if (subcategory) {
      query.subcategory = subcategory;
    }

    console.log('Query:', query); // Log the query to check if it's correct

    const products = await Product.find(query);
    res.status(200).send(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).send({ message: 'Error fetching products', error });
  }
});

app.get('/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const product = await Product.findById(id);
    if (product) {
      res.status(200).send(product);
    } else {
      res.status(404).send({ message: 'Product not found' });
    }
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).send({ message: 'Error fetching product', error });
  }
});

app.put('/products/:id', upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { name, description, category, subcategory } = req.body;
  try {
    const product = await Product.findById(id);
    if (product) {
      product.name = name;
      product.description = description;
      product.category = category;
      product.subcategory = subcategory;
      if (req.file) {
        console.log('Uploading file to Cloudinary:', req.file.path);
        const result = await cloudinary.uploader.upload(req.file.path);
        console.log('Cloudinary upload result:', result);
        product.imageUrl = result.secure_url;
      }
      await product.save();
      res.status(200).send(product);
    } else {
      res.status(404).send({ message: 'Product not found' });
    }
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(400).send({ message: 'Error updating product', error });
  }
});

app.delete('/products/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`Attempting to delete product with ID: ${id}`); // Log the ID being deleted
  try {
    const product = await Product.findByIdAndDelete(id);
    if (product) {
      res.status(200).send({ message: 'Product deleted successfully' });
    } else {
      res.status(404).send({ message: 'Product not found' });
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(400).send({ message: 'Error deleting product', error });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});