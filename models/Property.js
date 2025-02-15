const mongoose = require("mongoose");

const PropertySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  type: String,
  subtype: String,
  status: String,
  availableFor: String,
  price: String,
  location: String,
  localAddress: String,
  area: String,
  googleDriveImage: String,
  googleDriveVideo: String,
  googleMapLink: String,
  availableFrom: String,
  propertyInfo: String,
  propertyAge: String,
  propertyFacing: String,
  propertyFloor: String,
  propertyTotalFloor: String,
  agreement: String,
  amenities: [String],
  features: [String],
  images: [{ url: String }], // Ensure images are stored as objects with a "url" key
});

module.exports = mongoose.model("Property", PropertySchema);
