const express = require('express');
const mongoose = require('mongoose');
const propertyRoutes = require('./routes/propertyRoutes');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors()); // Enable CORS for front-end requests
app.use(express.json()); // Parse JSON request bodies

// Routes
app.use('/api/properties', propertyRoutes);

// Serve static files from the "uploads" directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection String
const dbURI = "mongodb+srv://jafarhajariiam:14051999@cluster0.shrc2.mongodb.net/real-estate?retryWrites=true&w=majority";

// Database Connection
mongoose
  .connect(dbURI, { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1); // Exit the process if connection fails
  });

// Server Setup
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
