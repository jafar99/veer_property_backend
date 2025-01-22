const express = require('express');
const mongoose = require('mongoose');
const propertyRoutes = require('./routes/propertyRoutes');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const morgan = require('morgan');
const helmet = require('helmet');
const crypto = require('crypto');
const { GridFsStorage } = require('multer-gridfs-storage');

dotenv.config();

if (!process.env.MONGO_URI || !process.env.PORT) {
  throw new Error('Missing required environment variables.');
}

const app = express();

app.use(express.json());
app.use(helmet());

// Logging for development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// CORS configuration
const allowedOrigins = [
  'https://veer-property-frontend.vercel.app',
  'http://localhost:3000', // Add this if you're working in local development
];

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
};
app.use(cors(corsOptions));

// MongoDB connection
const mongoURI = process.env.MONGO_URI;
const conn = mongoose.createConnection(mongoURI);

// Initialize GridFS
let gfs;
conn.once('open', () => {
  gfs = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'uploads' });
  console.log('GridFS initialized');
});

// Property routes
app.use('/api/properties', propertyRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.send({ status: 'Server is running', dbStatus });
});

// Serve images from MongoDB GridFS
app.get('/images/:filename', (req, res) => {
  const filename = req.params.filename;

  // Search for the file in the GridFS bucket
  gfs.files.findOne({ filename: filename }, (err, file) => {
    if (err || !file) {
      return res.status(404).send({ message: 'Image not found' });
    }

    // Check if the file is an image
    if (file.contentType && file.contentType.startsWith('image/')) {
      const readstream = gfs.createReadStream(file.filename);
      res.set('Content-Type', file.contentType);  // Set the correct image type
      readstream.pipe(res); // Send the image back in the response
    } else {
      return res.status(404).send({ message: 'Not an image file' });
    }
  });
});

// MongoDB connection
mongoose
  .connect(mongoURI)
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
  });
});

// Start the server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await mongoose.connection.close();
  conn.close();
  process.exit(0);
});
