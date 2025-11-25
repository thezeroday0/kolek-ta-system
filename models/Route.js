const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  routeId: { type: String, required: true, unique: true },
  name: String,
  bins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bin' }],
  path: {
    type: { type: String, enum: ['LineString'], default: 'LineString' },
    coordinates: [[Number]]
  },
  distance: Number,
  estimatedTime: Number,
  status: { type: String, enum: ['planned', 'active', 'completed', 'pending'], default: 'planned' },
  assignedDriver: String,
  assignedVehicle: String,
  scheduledDate: Date,
  // Completion data
  completionPhotos: [String], // Proof photos (base64 or URLs)
  completedAt: Date,
  completedBy: String,
  completionNotes: String,
  notificationSent: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Route', routeSchema);
