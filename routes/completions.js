const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const Route = require('../models/Route');

// Configure multer for memory storage (for Vercel - no file system)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Complete route with photos
router.post('/:routeId/complete', authenticateToken, upload.array('photos', 10), async (req, res) => {
  try {
    const { routeId } = req.params;
    const { notes } = req.body;
    
    // Find route by routeId or _id
    let route = await Route.findOne({ routeId: routeId });
    if (!route) {
      route = await Route.findById(routeId);
    }
    
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    // Check if driver is assigned to this route (allow if no driver assigned for testing)
    if (route.assignedDriver && route.assignedDriver !== req.user.username) {
      return res.status(403).json({ error: 'You are not assigned to this route' });
    }
    
    // Convert uploaded files to base64 (for Vercel - no file system)
    const photos = req.files.map(file => {
      const base64 = file.buffer.toString('base64');
      return `data:${file.mimetype};base64,${base64}`;
    });
    
    // Update route with completion data
    route.status = 'completed';
    route.completedAt = new Date();
    route.completedBy = req.user.username;
    route.completionNotes = notes || '';
    route.completionPhotos = photos;
    route.notificationSent = false;
    
    await route.save();
    
    res.json({
      message: 'Route marked as completed successfully!',
      route: {
        routeId: route.routeId,
        name: route.name,
        status: route.status,
        completedAt: route.completedAt,
        completedBy: route.completedBy
      }
    });
  } catch (error) {
    console.error('Error completing route:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get completion details
router.get('/:routeId/completion', authenticateToken, async (req, res) => {
  try {
    const { routeId } = req.params;
    
    let route = await Route.findOne({ routeId: routeId });
    if (!route) {
      route = await Route.findById(routeId);
    }
    
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    if (!route.completedAt) {
      return res.status(404).json({ error: 'Route not completed yet' });
    }
    
    res.json({
      completedAt: route.completedAt,
      completedBy: route.completedBy,
      completionNotes: route.completionNotes,
      completionPhotos: route.completionPhotos || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending notifications (for admin)
router.get('/notifications/pending', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const pendingNotifications = await Route.find({
      status: 'completed',
      completedAt: { $ne: null },
      notificationSent: { $ne: true }
    });
    
    res.json(pendingNotifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
router.post('/notifications/:routeId/read', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { routeId } = req.params;
    
    let route = await Route.findOne({ routeId: routeId });
    if (!route) {
      route = await Route.findById(routeId);
    }
    
    if (route) {
      route.notificationSent = true;
      await route.save();
    }
    
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete notification permanently
router.delete('/notifications/:routeId/delete', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { routeId } = req.params;
    
    let route = await Route.findOne({ routeId: routeId });
    if (!route) {
      route = await Route.findById(routeId);
    }
    
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    // Remove completion data but keep route
    route.status = 'pending';
    route.completedAt = null;
    route.completedBy = null;
    route.completionNotes = null;
    route.completionPhotos = [];
    route.notificationSent = false;
    
    await route.save();
    
    res.json({ message: 'Notification deleted permanently' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get notification history (all completed routes)
router.get('/notifications/history', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const completedRoutes = await Route.find({
      status: 'completed',
      completedAt: { $ne: null }
    }).sort({ completedAt: -1 });
    
    res.json(completedRoutes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get notification statistics
router.get('/notifications/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const total = await Route.countDocuments({ status: 'completed' });
    const unread = await Route.countDocuments({ status: 'completed', notificationSent: { $ne: true } });
    const read = await Route.countDocuments({ status: 'completed', notificationSent: true });
    
    res.json({
      total,
      unread,
      read
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
