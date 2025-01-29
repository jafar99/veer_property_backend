const express = require('express');
const mongoose = require('mongoose');
const propertyRoutes = require('./routes/propertyRoutes');
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
app.use(express.json()); // ✅ Ensures JSON parsing before handling routes
app.use(helmet());

// Logging for development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// CORS configuration
const allowedOrigins = ['https://veer-property-frontend.vercel.app', 'http://localhost:3000'];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('❌ Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

// Routes
app.use('/api/properties', propertyRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running', dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({ success: false, error: err.message || 'Internal Server Error' });
});

// Start the server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// Graceful Shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});
