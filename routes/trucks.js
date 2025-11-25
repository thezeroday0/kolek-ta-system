const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const Truck = require('../models/Truck');

// Mock trucks storage (for reference only - now using persistent storage)
const defaultTrucks = [
  {
    _id: '1',
    truckId: 'TRUCK-001',
    plateNumber: 'ABC-1234',
    model: 'Isuzu Elf',
    capacity: 1000,
    status: 'available',
    assignedDriver: null,
    lastMaintenance: '2024-01-15',
    nextMaintenance: '2024-04-15',
    fuelLevel: 85,
    mileage: 15420,
    notes: 'Good condition'
  },
  {
    _id: '2',
    truckId: 'TRUCK-002',
    plateNumber: 'XYZ-5678',
    model: 'Mitsubishi Canter',
    capacity: 1200,
    status: 'in-use',
    assignedDriver: 'driver1',
    lastMaintenance: '2024-02-01',
    nextMaintenance: '2024-05-01',
    fuelLevel: 60,
    mileage: 22350,
    notes: 'Assigned to Juan Dela Cruz'
  }
];

// Get all trucks
router.get('/', authenticateToken, async (req, res) => {
  try {
    const trucks = await Truck.find({});
    res.json(trucks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single truck
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const truck = await Truck.findById(req.params.id);
    if (!truck) {
      return res.status(404).json({ error: 'Truck not found' });
    }
    res.json(truck);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new truck (Admin only)
router.post('/', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { truckId, plateNumber, model, capacity, notes } = req.body;
    
    // Check if truckId exists
    const existingTruckId = await Truck.findOne({ truckId });
    if (existingTruckId) {
      return res.status(400).json({ error: 'Truck ID already exists' });
    }
    
    // Check if plate number exists
    const existingPlate = await Truck.findOne({ plateNumber: plateNumber.toUpperCase() });
    if (existingPlate) {
      return res.status(400).json({ error: 'Plate number already exists' });
    }
    
    const newTruck = await Truck.create({
      truckId,
      plateNumber: plateNumber.toUpperCase(),
      model: model || '',
      capacity: capacity || 1000,
      status: 'available',
      assignedDriver: null,
      lastMaintenance: null,
      nextMaintenance: null,
      fuelLevel: 100,
      mileage: 0,
      notes: notes || ''
    });
    
    res.status(201).json(newTruck);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update truck (Admin only)
router.put('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const truck = await Truck.findById(req.params.id);
    if (!truck) {
      return res.status(404).json({ error: 'Truck not found' });
    }
    
    const { plateNumber, model, capacity, status, assignedDriver, lastMaintenance, nextMaintenance, fuelLevel, mileage, notes } = req.body;
    
    // Check if plate number is taken by another truck
    if (plateNumber) {
      const existingPlate = await Truck.findOne({ 
        plateNumber: plateNumber.toUpperCase(), 
        _id: { $ne: truck._id } 
      });
      if (existingPlate) {
        return res.status(400).json({ error: 'Plate number already exists' });
      }
      truck.plateNumber = plateNumber.toUpperCase();
    }
    
    if (model !== undefined) truck.model = model;
    if (capacity !== undefined) truck.capacity = capacity;
    if (status) truck.status = status;
    if (assignedDriver !== undefined) truck.assignedDriver = assignedDriver;
    if (lastMaintenance !== undefined) truck.lastMaintenance = lastMaintenance;
    if (nextMaintenance !== undefined) truck.nextMaintenance = nextMaintenance;
    if (fuelLevel !== undefined) truck.fuelLevel = fuelLevel;
    if (mileage !== undefined) truck.mileage = mileage;
    if (notes !== undefined) truck.notes = notes;
    
    await truck.save();
    res.json(truck);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete truck (Admin only)
router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const truck = await Truck.findById(req.params.id);
    if (!truck) {
      return res.status(404).json({ error: 'Truck not found' });
    }
    
    await Truck.deleteOne({ _id: truck._id });
    res.json({ message: 'Truck deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available trucks
router.get('/status/available', authenticateToken, async (req, res) => {
  try {
    const available = await Truck.find({ status: 'available' });
    res.json(available);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign driver to truck (Admin only)
router.post('/:id/assign', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { driverId } = req.body;
    
    const truck = await Truck.findById(req.params.id);
    if (!truck) {
      return res.status(404).json({ error: 'Truck not found' });
    }
    
    // Update truck assignment
    truck.assignedDriver = driverId || null;
    truck.status = driverId ? 'in-use' : 'available';
    await truck.save();
    
    res.json(truck);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
