const mongoose = require('mongoose');

// Function to connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/real-estate', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      
    });
    console.log('MongoDB connected successfully!');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1); // Exit the application if the database connection fails
  }
};

module.exports = connectDB;
