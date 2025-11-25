const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Route = require('../models/Route');

// Mark route as completed with photos (Driver only)
router.post('/:routeId/complete', authenticateToken, async (req, res) => {
  try {
    const { routeId } = req.params;
    const { photos, notes } = req.body; // photos as base64 strings array
    const driverUsername = req.user.username;

    const route = await Route.findOne({ routeId });
    
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    // Verify driver is assigned to this route
    if (route.assignedDriver !== driverUsername) {
      return res.status(403).json({ error: 'You are not assigned to this route' });
    }

    // Update route with completion data
    route.status = 'completed';
    route.completedAt = new Date();
    route.completionPhotos = photos || [];
    route.completionNotes = notes || '';
    
    await route.save();

    res.json({
      message: 'Route marked as completed successfully',
      route: {
        routeId: route.routeId,
        name: route.name,
        completedAt: route.completedAt,
        photoCount: route.completionPhotos.length
      }
    });
  } catch (error) {
    console.error('Error completing route:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get completion details (Admin)
router.get('/:routeId/completion', authenticateToken, async (req, res) => {
  try {
    const { routeId } = req.params;
    
    const route = await Route.findOne({ routeId });
    
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    if (route.status !== 'completed') {
      return res.status(400).json({ error: 'Route is not completed yet' });
    }

    res.json({
      routeId: route.routeId,
      name: route.name,
      assignedDriver: route.assignedDriver,
      completedAt: route.completedAt,
      completionNotes: route.completionNotes,
      completionPhotos: route.completionPhotos,
      photoCount: route.completionPhotos.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
