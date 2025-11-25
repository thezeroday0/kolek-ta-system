const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Route = require('../models/Route');

// Mark route as completed with photos (Driver only)
router.post('/:routeId/complete', authenticateToken, async (req, res) => {
  try {
    const { routeId } = req.params;
    const { photos, notes } = req.body;
    const driverUsername = req.user.username;

    console.log('Completing route:', routeId, 'by driver:', driverUsername);
    console.log('Photos count:', photos?.length || 0);

    const route = await Route.findOne({ routeId });
    
    if (!route) {
      console.log('Route not found:', routeId);
      return res.status(404).json({ error: 'Route not found' });
    }

    console.log('Route found. Assigned driver:', route.assignedDriver);

    // Verify driver is assigned to this route (or allow any driver for testing)
    if (route.assignedDriver && route.assignedDriver !== driverUsername) {
      console.log('Driver not assigned to route');
      return res.status(403).json({ error: 'You are not assigned to this route' });
    }

    // Update route with completion data
    route.status = 'completed';
    route.completedAt = new Date();
    route.completionPhotos = photos || [];
    route.completionNotes = notes || '';
    
    await route.save();

    console.log('Route completed successfully');

    res.json({
      success: true,
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
    res.status(500).json({ error: error.message || 'Failed to complete route' });
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
