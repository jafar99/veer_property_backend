require('dotenv').config();
const express = require('express');
const Review = require('../models/Review');

const router = express.Router();

// Get all reviews (newest first)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const reviews = await Review.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    const total = await Review.countDocuments();
    res.json({ reviews, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).send({ error: 'Failed to fetch reviews' });
  }
});

// Create a new review
router.post('/', async (req, res) => {
  try {
    const { name, message, rating } = req.body;

    if (!name || !message || typeof rating === 'undefined') {
      return res.status(400).json({ error: 'name, message and rating are required' });
    }

    if (message.length > 200) {
      return res.status(400).json({ error: 'message must be 200 characters or fewer' });
    }

    const review = new Review({ name, message, rating });
    const validationError = review.validateSync();
    if (validationError) {
      return res.status(400).json({ error: 'Validation error', details: validationError.errors });
    }

    await review.save();
    res.status(201).json({ message: 'Review submitted successfully', review });
  } catch (err) {
    console.error('Error creating review:', err);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

module.exports = router;


