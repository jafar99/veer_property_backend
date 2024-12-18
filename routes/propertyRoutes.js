const express = require('express');
const multer = require('multer');
const Property = require('../models/Property');
const path = require('path');
const cors = require('cors');
// 04445614700
const router = express.Router();

// Enable CORS for front-end requests
router.use(cors());

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Directory to store uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Unique file naming
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
});

// Get all properties
router.get('/', async (req, res) => {
  try {
    const properties = await Property.find();
    res.json(properties);
  } catch (err) {
    console.error('Error fetching properties:', err);
    res.status(500).send(err.message);
  }
});

// Get a property by ID
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).send('Property not found');
    }
    res.json(property);
  } catch (err) {
    console.error('Error fetching property:', err);
    res.status(500).send(err.message);
  }
  
});

// Add a new property
router.post('/', upload.array('images', 10), async (req, res) => {
  console.log('Received data:', req.body); // Log incoming data
  console.log('Received files:', req.files); // Log incoming files

  try {
    const images = req.files.map((file) => `/uploads/${file.filename}`); // Store uploaded file paths
    const propertyData = { ...req.body, images };
    const property = new Property(propertyData);
    await property.save();
    res.status(201).json(property);
  } catch (err) {
    console.error('Error adding property:', err);
    res.status(400).send(err.message);
  }
});

// Update a property
router.put('/:id', upload.array('images', 10), async (req, res) => {
  console.log('Received data for update:', req.body); // Log incoming data
  console.log('Received files for update:', req.files); // Log incoming files

  try {
    const images = req.files.map((file) => `/uploads/${file.filename}`); // Update with uploaded file paths
    const updatedData = { ...req.body, images };
    const property = await Property.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    if (!property) {
      return res.status(404).send('Property not found');
    }
    res.json(property);
  } catch (err) {
    console.error('Error updating property:', err);
    res.status(400).send(err.message);
  }
});

// Delete a property
router.delete('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).send('Property not found');
    }
    await Property.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting property:', err);
    res.status(500).send(err.message);
  }
});

module.exports = router;
