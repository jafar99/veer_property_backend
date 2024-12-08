const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    title: { type: String },
    description: { type: String },
    type: { type: String },
    price: { type: Number },
    location: { type: String },
    amenities: [{ type: String }],
    images: [{ type: String }], // Array of image URLs
  },
  { timestamps: true }
);

module.exports = mongoose.model('Property', propertySchema);
