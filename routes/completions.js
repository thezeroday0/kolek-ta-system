const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const { routesStorage } = require('../data/storage');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'completion-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
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
    const route = routesStorage.findById(routeId);
    
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    // Check if driver is assigned to this route
    if (route.assignedDriver !== req.user.username) {
      return res.status(403).json({ error: 'You are not assigned to this route' });
    }
    
    // Get uploaded file paths
    const photos = req.files.map(file => `/uploads/${file.filename}`);
    
    // Update route with completion data
    const updates = {
      status: 'completed',
      completedAt: new Date().toISOString(),
      completedBy: req.user.username,
      completionNotes: notes || '',
      completionPhotos: photos,
      notificationSent: false // Flag for admin notification
    };
    
    routesStorage.update(routeId, updates);
    const updatedRoute = routesStorage.findById(routeId);
    
    res.json({
      message: 'Route marked as completed successfully!',
      route: updatedRoute
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
    const route = routesStorage.findById(routeId);
    
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
    
    const allRoutes = routesStorage.getAll();
    const pendingNotifications = allRoutes.filter(r => 
      r.status === 'completed' && 
      r.completedAt && 
      !r.notificationSent
    );
    
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
    routesStorage.update(routeId, { notificationSent: true });
    
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
    const route = routesStorage.findById(routeId);
    
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    // Delete completion photos from disk
    if (route.completionPhotos && route.completionPhotos.length > 0) {
      route.completionPhotos.forEach(photoPath => {
        const fullPath = path.join(__dirname, '../public', photoPath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      });
    }
    
    // Remove completion data but keep route
    routesStorage.update(routeId, {
      status: 'pending',
      completedAt: null,
      completedBy: null,
      completionNotes: null,
      completionPhotos: [],
      notificationSent: false
    });
    
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
    
    const allRoutes = routesStorage.getAll();
    const completedRoutes = allRoutes.filter(r => 
      r.status === 'completed' && r.completedAt
    ).sort((a, b) => {
      // Sort by completion date, newest first
      return new Date(b.completedAt) - new Date(a.completedAt);
    });
    
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
    
    const allRoutes = routesStorage.getAll();
    const completed = allRoutes.filter(r => r.status === 'completed');
    const unread = completed.filter(r => !r.notificationSent);
    const read = completed.filter(r => r.notificationSent);
    
    res.json({
      total: completed.length,
      unread: unread.length,
      read: read.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
