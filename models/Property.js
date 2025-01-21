const mongoose = require('mongoose');

// Define the property schema
const propertySchema = new mongoose.Schema(
  {
    title: { type: String },
    description: { type: String },
    type: { type: String },
    status: { type: String },
    availableFor: { type: String },
    price: { type: Number },
    location: { type: String },
    localAddress: { type: String },
    area: { type: Number },
    googleMapLink: { type: String },
    availableFrom: { type: String },
    propertyInfo: { type: String },
    propertyAge: { type: Number },
    propertyFacing: { type: String },
    propertyFloor: { type: Number },
    propertyTotalFloor: { type: Number },
    googldriveimage: { type: String },
    gooogledrivevideo: { type: String },
    agreement: { type: String },
    amenities: { type: String },
    features: { type: String },
    // Updated to store images in GridFS
    images: [
      {
        filename: { type: String },
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'GridFSFile' },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Property', propertySchema);
