const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, required: true },
    status : { type: String, required: true },
    availableFor: { type: String, required: true },
    price: { type: Number, required: true },
    location: { type: String, required: true },
    localAddress: { type: String, required: true },
    area: { type: Number, required: true },
    availableFrom: { type: String , required: true },
    propertyInfo : { type: String, required: true },
    propertyAge : { type: Number, required: true },
    propertyFacing : { type: String, required: true },
    propertyFloor : { type: Number, required: true },
    propertyTotalFloor : { type: Number, required: true },
    agreement : { type: String, required: true },
    amenities : { type: String, required: true },
    features : { type: String, required: true },
    images: { type: [String], required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Property', propertySchema);
