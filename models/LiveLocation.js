const mongoose = require('mongoose');

const liveLocationSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  lat: {
    type: Number,
    required: true
  },
  lng: {
    type: Number,
    required: true
  },
  speed: {
    type: Number,
    default: 0
  },
  heading: {
    type: Number,
    default: 0
  },
  routeId: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  lastUpdate: {
    type: Number,
    default: Date.now
  }
}, {
  timestamps: true
});

// Auto-delete old locations after 10 minutes of inactivity
liveLocationSchema.index({ lastUpdate: 1 }, { expireAfterSeconds: 600 });

// Method to check if location is fresh (less than 5 minutes old)
liveLocationSchema.methods.isFresh = function() {
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  return this.lastUpdate > fiveMinutesAgo;
};

// Static method to get all active locations
liveLocationSchema.statics.getActive = function() {
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  return this.find({ lastUpdate: { $gt: fiveMinutesAgo } });
};

// Static method to cleanup stale locations
liveLocationSchema.statics.cleanupStale = function() {
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  return this.deleteMany({ lastUpdate: { $lt: fiveMinutesAgo } });
};

module.exports = mongoose.model('LiveLocation', liveLocationSchema);
