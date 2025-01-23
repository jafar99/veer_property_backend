const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const Property = require('../models/Property');
const crypto = require('crypto');
const path = require('path');
const { GridFsStorage } = require('multer-gridfs-storage');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Configure GridFS storage for multer
const mongoURI = process.env.MONGO_URI;
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

// Middleware for validating input
const validateProperty = [
  body('title').notEmpty().withMessage('Title is required'),
];

// Get all properties with pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const properties = await Property.find()
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    const total = await Property.countDocuments();
    res.json({ properties, total, page, limit });
  } catch (err) {
    console.error('Error fetching properties:', err);
    res.status(500).send({ error: 'Failed to fetch properties' });
  }
});

// Serve images from MongoDB GridFS
router.get('/images/:filename', (req, res) => {
  const gfs = req.gfs; // Access `gfs` from the request object
  const filename = req.params.filename;

  gfs.find({ filename }).toArray((err, files) => {
    if (err || !files || files.length === 0) {
      return res.status(404).send({ message: 'Image not found' });
    }

    const file = files[0];
    if (file.contentType && file.contentType.startsWith('image/')) {
      const readstream = gfs.openDownloadStreamByName(filename);
      res.set('Content-Type', file.contentType);
      readstream.pipe(res);
    } else {
      res.status(404).send({ message: 'Not an image file' });
    }
  });
});

// Upload a new property with image
router.post('/', upload.single('image'), validateProperty, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, description, price } = req.body;
    const property = new Property({
      title,
      description,
      price,
      image: req.file.filename,
    });

    await property.save();
    res.status(201).json(property);
  } catch (err) {
    console.error('Error creating property:', err);
    res.status(500).send({ error: 'Failed to create property' });
  }
});

// Delete a property
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const property = await Property.findByIdAndDelete(id);

    if (!property) {
      return res.status(404).send({ message: 'Property not found' });
    }

    const gfs = req.gfs; // Access `gfs` from the request object
    gfs.delete(property.image, (err) => {
      if (err) {
        console.error('Error deleting image from GridFS:', err);
        return res.status(500).send({ error: 'Failed to delete image' });
      }
    });

    res.status(200).send({ message: 'Property deleted successfully' });
  } catch (err) {
    console.error('Error deleting property:', err);
    res.status(500).send({ error: 'Failed to delete property' });
  }
});



module.exports = router;
