const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { routesStorage } = require('../data/storage');

// Mock routes storage (for reference only - now using persistent storage)
const defaultRoutes = [
  {
    _id: '1',
    routeId: 'ROUTE-001',
    name: 'Downtown Collection Route',
    path: {
      type: 'LineString',
      coordinates: [
        [126.2185, 6.9549],
        [126.2200, 6.9560],
        [126.2170, 6.9570]
      ]
    },
    distance: 2500,
    status: 'planned',
    notes: 'Main downtown area collection'
  }
];

// Get all routes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const routes = routesStorage.getAll();
    res.json(routes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single route
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const route = routesStorage.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    res.json(route);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new route
router.post('/', async (req, res) => {
  try {
    const newRoute = {
      _id: String(Date.now()),
      routeId: req.body.routeId,
      name: req.body.name,
      path: req.body.path,
      distance: calculateDistance(req.body.path.coordinates),
      status: req.body.status || 'planned',
      notes: req.body.notes || ''
    };
    
    routesStorage.add(newRoute);
    res.status(201).json(newRoute);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update route
router.put('/:id', async (req, res) => {
  try {
    const route = routesStorage.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    // Update fields
    const updates = {};
    if (req.body.assignedDriver !== undefined) updates.assignedDriver = req.body.assignedDriver;
    if (req.body.status) updates.status = req.body.status;
    if (req.body.name) updates.name = req.body.name;
    if (req.body.notes !== undefined) updates.notes = req.body.notes;
    
    routesStorage.update(route._id, updates);
    const updatedRoute = routesStorage.findById(route._id);
    res.json(updatedRoute);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete route
router.delete('/:id', async (req, res) => {
  try {
    const route = routesStorage.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    routesStorage.delete(route._id);
    res.json({ message: 'Route deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to calculate distance
function calculateDistance(coordinates) {
  if (!coordinates || coordinates.length < 2) return 0;
  
  let total = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    total += haversineDistance(coordinates[i], coordinates[i + 1]);
  }
  return total;
}

function haversineDistance(coord1, coord2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = coord1[1] * Math.PI / 180;
  const φ2 = coord2[1] * Math.PI / 180;
  const Δφ = (coord2[1] - coord1[1]) * Math.PI / 180;
  const Δλ = (coord2[0] - coord1[0]) * Math.PI / 180;
  
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}

module.exports = router;
