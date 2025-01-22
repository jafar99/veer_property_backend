const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const Property = require('../models/Property');
const crypto = require('crypto');
const { GridFsStorage } = require('multer-gridfs-storage');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const router = express.Router();
router.use(cors());

// MongoDB connection URI
const mongoURI = process.env.MONGO_URI;
const conn = mongoose.createConnection(mongoURI);

let gfs;
conn.once('open', () => {
  gfs = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: 'uploads',
  });
});

// Configure GridFS storage for multer
const storage = new GridFsStorage({
  url: mongoURI,
  options: { useUnifiedTopology: true },
  file: (req, file) =>
    new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buffer) => {
        if (err) return reject(err);
        const filename = buffer.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename,
          bucketName: 'uploads',
        };
        resolve(fileInfo);
      });
    }),
});

const upload = multer({ storage });

// Get all properties
router.get('/', async (req, res) => {
  try {
    const properties = await Property.find().lean();
    res.json(properties);
  } catch (err) {
    console.error('Error fetching properties:', err);
    res.status(500).send({ error: 'Failed to fetch properties' });
  }
});

// Get a property by ID
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).lean();
    if (!property) {
      return res.status(404).send({ error: 'Property not found' });
    }
    res.json(property);
  } catch (err) {
    console.error('Error fetching property:', err);
    res.status(500).send({ error: 'Failed to fetch property' });
  }
});

// Add a new property
router.post('/', upload.array('images', 10), async (req, res) => {
  try {
    const images = req.files.map((file) => ({
      filename: file.filename,
      id: file.id,
    }));

    const propertyData = { ...req.body, images };
    const property = new Property(propertyData);
    await property.save();
    res.status(201).json(property);
  } catch (err) {
    console.error('Error adding property:', err);
    res.status(400).send({ error: 'Failed to add property' });
  }
});

// Update a property
router.put('/:id', upload.array('images', 10), async (req, res) => {
  try {
    const existingProperty = await Property.findById(req.params.id);
    if (!existingProperty) {
      return res.status(404).send({ error: 'Property not found' });
    }

    const uploadedImages = req.files.map((file) => ({
      filename: file.filename,
      id: file.id,
    }));

    const images =
      uploadedImages.length > 0
        ? [...existingProperty.images, ...uploadedImages]
        : existingProperty.images;

    const updatedData = {
      ...req.body,
      images,
    };

    const updatedProperty = await Property.findByIdAndUpdate(req.params.id, updatedData, {
      new: true,
    });

    res.json(updatedProperty);
  } catch (err) {
    console.error('Error updating property:', err);
    res.status(400).send({ error: 'Failed to update property' });
  }
});

// Delete a property
router.delete('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).send({ error: 'Property not found' });
    }

    if (property.images) {
      for (const image of property.images) {
        await gfs.delete(new mongoose.Types.ObjectId(image.id));
      }
    }

    await Property.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting property:', err);
    res.status(500).send({ error: 'Failed to delete property' });
  }
});

// Serve images from MongoDB GridFS
router.get('/image/:filename', (req, res) => {
  gfs.openDownloadStreamByName(req.params.filename)
    .pipe(res)
    .on('error', (err) => {
      console.error('Error fetching file:', err);
      res.status(404).send({ error: 'File not found' });
    });
});

module.exports = router;
