const express = require('express');
const mongoose = require('mongoose');
const propertyRoutes = require('./routes/propertyRoutes');
const cors = require('cors');
const path = require('path');
require('dotenv').config(); // Load environment variables from .env file

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/properties', propertyRoutes);

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection String from .env
const dbURI = process.env.MONGO_URI; // Get connection string from environment variables

// Database Connection
mongoose
  .connect(dbURI, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    // console.log('MongoDB connected successfully');
  } )
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1); // Exit the process if connection fails
  });

// Server Setup
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  // console.log(`Server running on port ${PORT}`);
});
