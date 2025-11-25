const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
  bin: { type: mongoose.Schema.Types.ObjectId, ref: 'Bin', required: true },
  route: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
  collectedAt: { type: Date, default: Date.now },
  wasteAmount: Number,
  collectorId: String,
  notes: String,
  // Completion proof
  completionPhotos: [String], // Array of photo URLs or base64 strings
  completedBy: String, // Driver username
  completedAt: Date,
  status: { 
    type: String, 
    enum: ['pending', 'in-progress', 'completed'], 
    default: 'pending' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Collection', collectionSchema);
