const express = require('express');
const mongoose = require('mongoose');
const propertyRoutes = require('./routes/propertyRoutes');
const cors = require('cors');
const path = require('path');
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
const allowedOrigins = [
  'https://veer-property-frontend.vercel.app',
  'http://localhost:3000', // Add this if you're working in local development
];

const corsOptions = {
  origin: (origin, callback) => {
    // Log the origin to see what's being sent
    console.log('Request Origin:', origin);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));

// Property routes
app.use('/api/properties', propertyRoutes);

// Serve static images
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.send({ status: 'Server is running', dbStatus });
});

// MongoDB connection
const mongoURI = process.env.MONGO_URI;

let gfs;
const conn = mongoose.createConnection(mongoURI);

conn.once('open', () => {
  gfs = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'uploads' });
  console.log('GridFS initialized');
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
