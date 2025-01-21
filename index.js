const express = require('express');
const mongoose = require('mongoose');
const propertyRoutes = require('./routes/propertyRoutes');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const morgan = require('morgan'); // Optional: For HTTP logging

dotenv.config(); // Load environment variables from .env file

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Enable logging in development mode (optional)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// CORS for the front-end URL
app.use(cors({
  origin: 'https://veer-property-frontend.vercel.app',
  credentials: true
}));

// Routes for property-related actions
app.use('/api/properties', propertyRoutes);

// Serve static files (for images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection String from .env
const mongoURI = process.env.MONGO_URI; // MongoDB URI

// Create MongoDB connection
const conn = mongoose.createConnection(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let gfs;

// Open a connection to GridFS
conn.once('open', () => {
  gfs = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: 'uploads', // The collection name where files will be stored
  });
});

// Database Connection
mongoose
  .connect(mongoURI, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1); // Exit the process if connection fails
  });

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send({ error: 'Something went wrong!' });
});

// Server Setup
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
