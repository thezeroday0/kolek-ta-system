const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// In-memory storage for live locations (use Redis in production)
const liveLocations = new Map();

// Update driver location
router.post('/update', authenticateToken, async (req, res) => {
  try {
    const { lat, lng, routeId, speed, heading } = req.body;
    const username = req.user.username;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }
    
    // Store location data
    const locationData = {
      username,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      routeId,
      speed: speed || 0,
      heading: heading || 0,
      timestamp: new Date().toISOString(),
      lastUpdate: Date.now()
    };
    
    liveLocations.set(username, locationData);
    
    res.json({
      message: 'Location updated',
      location: locationData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all active driver locations (Admin only)
router.get('/active', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Remove stale locations (older than 5 minutes)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const activeLocations = [];
    
    for (const [username, location] of liveLocations.entries()) {
      if (location.lastUpdate > fiveMinutesAgo) {
        activeLocations.push(location);
      } else {
        liveLocations.delete(username);
      }
    }
    
    res.json(activeLocations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get ALL assigned trucks (with last known or default location)
router.get('/all-trucks', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { usersStorage, routesStorage, trucksStorage } = require('../data/storage');
    
    const users = usersStorage.getAll();
    const routes = routesStorage.getAll();
    const trucks = trucksStorage.getAll();
    
    const allTrucks = [];
    
    // Get all drivers
    const drivers = users.filter(u => u.role === 'driver');
    
    drivers.forEach(driver => {
      // Find assigned route
      const assignedRoute = routes.find(r => r.driverId === driver.username);
      
      // Find assigned truck (handle both assignedDriver and driverId field names)
      const assignedTruck = trucks.find(t => 
        t.assignedDriver === driver.username || t.driverId === driver.username
      );
      
      if (assignedRoute && assignedTruck) {
        // Check if driver has recent GPS location
        const liveLocation = liveLocations.get(driver.username);
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        
        let location;
        if (liveLocation && liveLocation.lastUpdate > fiveMinutesAgo) {
          // Use live GPS location
          location = {
            lat: liveLocation.lat,
            lng: liveLocation.lng,
            speed: liveLocation.speed || 0,
            heading: liveLocation.heading || 0,
            isLive: true,
            timestamp: liveLocation.timestamp
          };
        } else {
          // Use route's first location as default
          const firstLocation = assignedRoute.locations && assignedRoute.locations[0];
          if (firstLocation) {
            location = {
              lat: firstLocation.lat,
              lng: firstLocation.lng,
              speed: 0,
              heading: 0,
              isLive: false,
              timestamp: null
            };
          } else {
            // Default to Davao City center
            location = {
              lat: 7.0644,
              lng: 125.6078,
              speed: 0,
              heading: 0,
              isLive: false,
              timestamp: null
            };
          }
        }
        
        allTrucks.push({
          username: driver.username,
          fullName: driver.fullName || driver.username,
          truckId: assignedTruck.truckId,
          plateNumber: assignedTruck.plateNumber,
          model: assignedTruck.model,
          routeId: assignedRoute.routeId,
          routeName: assignedRoute.name,
          ...location
        });
      }
    });
    
    res.json(allTrucks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific driver location
router.get('/driver/:username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    
    // Drivers can only see their own location, admins can see all
    if (req.user.role !== 'admin' && req.user.username !== username) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const location = liveLocations.get(username);
    
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    // Check if location is stale
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    if (location.lastUpdate < fiveMinutesAgo) {
      liveLocations.delete(username);
      return res.status(404).json({ error: 'Location data is stale' });
    }
    
    res.json(location);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear driver location (when driver logs out or stops tracking)
router.delete('/clear', authenticateToken, async (req, res) => {
  try {
    const username = req.user.username;
    liveLocations.delete(username);
    
    res.json({ message: 'Location cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
