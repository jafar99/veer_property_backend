const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    title: { type: String },
    description: { type: String },
    type: { type: String },
    status : { type: String },
    availableFor: { type: String },
    price: { type: Number },
    location: { type: String },
    localAddress: { type: String },
    area: { type: Number },
    googleMapLink: { type: String },
    availableFrom: { type: String  },
    propertyInfo : { type: String },
    propertyAge : { type: Number },
    propertyFacing : { type: String },
    propertyFloor : { type: Number },
    propertyTotalFloor : { type: Number },
    googldriveimage : { type: String  },
    gooogledrivevideo : { type: String },
    agreement : { type: String },
    amenities : { type: String },
    features : { type: String },
    images: { type: [String] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Property', propertySchema);
