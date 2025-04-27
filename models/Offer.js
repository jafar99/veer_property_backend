const mongoose = require("mongoose");

const OfferSchema = new mongoose.Schema({
  images: [{
    url: { type: String, required: true },
    public_id: { type: String, required: true }
  }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Offer", OfferSchema); 