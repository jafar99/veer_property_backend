const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, required: true },
    price: { type: Number, required: true },
    location: { type: String, required: true },
    amenities: [{ type: String }],
    images: [{ type: String }], // Array of image URLs
  },
  { timestamps: true }
);

module.exports = mongoose.model('Property', propertySchema);
