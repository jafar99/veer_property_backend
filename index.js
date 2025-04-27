const express = require('express');
const mongoose = require('mongoose');
const propertyRoutes = require('./routes/propertyRoutes');
const offerRoutes = require('./routes/offerRoutes');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const helmet = require('helmet');

dotenv.config();

if (!process.env.MONGO_URI || !process.env.PORT) {
  throw new Error('❌ Missing required environment variables.');
}

const app = express();

// Middleware
app.use(express.json());
app.use(helmet());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://veer-properties.vercel.app'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600
};

app.use(cors(corsOptions));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true , writeConcern: { w: 'majority' } })
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

// Routes   
app.use('/api/properties', propertyRoutes);
app.use('/api/offers', offerRoutes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
