const mongoose = require('mongoose');

const truckSchema = new mongoose.Schema({
  truckId: { type: String, required: true, unique: true },
  plateNumber: { type: String, required: true, unique: true },
  model: String,
  capacity: { type: Number, default: 1000 }, // in kg
  status: { 
    type: String, 
    enum: ['available', 'in-use', 'maintenance', 'out-of-service'], 
    default: 'available' 
  },
  assignedDriver: String, // Username of the driver (not ObjectId)
  lastMaintenance: Date,
  nextMaintenance: Date,
  fuelLevel: { type: Number, default: 100 }, // percentage
  mileage: { type: Number, default: 0 }, // in km
  notes: String
}, { timestamps: true });

// Clear any existing model to avoid schema caching issues
if (mongoose.models.Truck) {
  delete mongoose.models.Truck;
}

module.exports = mongoose.model('Truck', truckSchema);
