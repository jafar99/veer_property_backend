const express = require('express');
const mongoose = require('mongoose');
const propertyRoutes = require('./routes/propertyRoutes');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const helmet = require('helmet');

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
const allowedOrigins = ['https://veer-property-frontend.vercel.app', 'http://localhost:3000'];
const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
};
app.use(cors(corsOptions));

// MongoDB connection
const mongoURI = process.env.MONGO_URI;
const conn = mongoose.createConnection(mongoURI);

let gfs;
conn.once('open', () => {
  gfs = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'uploads' });
  console.log('GridFS initialized');
});

// Serve images from MongoDB GridFS
app.get('/images/:filename', (req, res) => {
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

// Property routes
app.use('/api/properties', propertyRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.send({ status: 'Server is running', dbStatus });
});

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
