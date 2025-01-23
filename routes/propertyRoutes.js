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
          bucketName: 'uploads', // Define the GridFS bucket name
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
// Serve images from MongoDB GridFS
app.get('/images/:filename', (req, res) => {
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
      res.set('Access-Control-Allow-Origin', '*'); // Allow any origin to access the image
      readstream.pipe(res);
    } else {
      res.status(404).send({ message: 'Not an image file' });
    }
  });
});


// Upload a new property with image(s)
router.post('/', upload.array('images', 5), validateProperty, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, description, price, amenities, location, ...otherProps } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Images are required' });
    }

    // Prepare the images array from the uploaded files
    const imagesData = req.files.map((file) => ({
      filename: file.filename,
      id: file.id, // Store the GridFS file's ObjectId here
    }));

    const property = new Property({
      title,
      description,
      price,
      amenities,
      location,
      images: imagesData, // Store the image information in the property
      ...otherProps,
    });

    await property.save();
    res.status(201).json(property);
  } catch (err) {
    console.error('Error creating property:', err);
    res.status(500).send({ error: 'Failed to create property' });
  }
});

// Delete a property and its associated images from GridFS
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const property = await Property.findByIdAndDelete(id);

    if (!property) {
      return res.status(404).send({ message: 'Property not found' });
    }

    const gfs = req.gfs; // Access `gfs` from the request object
    await Promise.all(
      property.images.map(async (image) => {
        await gfs.delete(image.id); // Delete image from GridFS using ObjectId
      })
    );

    res.status(200).send({ message: 'Property and its images deleted successfully' });
  } catch (err) {
    console.error('Error deleting property:', err);
    res.status(500).send({ error: 'Failed to delete property' });
  }
});

module.exports = router;
