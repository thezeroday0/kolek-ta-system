# 🚀 Complete Vercel + MongoDB Migration Guide

## ⚠️ IMPORTANT: Read This First!

**Estimated Time:** 4-6 hours  
**Difficulty:** Advanced  
**Risk Level:** High (you're modifying a working system)

**BACKUP YOUR CODE FIRST!**
```bash
# Create a backup branch
git checkout -b backup-before-vercel
git add .
git commit -m "Backup before Vercel migration"
git checkout -b vercel-migration
```

---

## 📋 Migration Checklist

- [ ] Part 1: Set up MongoDB Atlas (15 min)
- [ ] Part 2: Install dependencies (5 min)
- [ ] Part 3: Create MongoDB models (30 min)
- [ ] Part 4: Update server.js (20 min)
- [ ] Part 5: Update tracking.js (30 min)
- [ ] Part 6: Update all route files (2 hours)
- [ ] Part 7: Set up Cloudinary (30 min)
- [ ] Part 8: Test locally (1 hour)
- [ ] Part 9: Deploy to Vercel (30 min)
- [ ] Part 10: Test production (30 min)

---

## Part 1: Set Up MongoDB Atlas

### Step 1.1: Create Account
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up (free)
3. Create M0 Free cluster
4. Region: Singapore (closest to Philippines)
5. Cluster name: `kolek-ta-cluster`

### Step 1.2: Create Database User
1. Database Access → Add New User
2. Username: `kolekta_admin`
3. Password: Generate strong password (SAVE IT!)
4. Privileges: Read and write to any database

### Step 1.3: Whitelist IPs
1. Network Access → Add IP Address
2. Allow Access from Anywhere: `0.0.0.0/0`

### Step 1.4: Get Connection String
```
mongodb+srv://kolekta_admin:YOUR_PASSWORD@kolek-ta-cluster.xxxxx.mongodb.net/kolekta?retryWrites=true&w=majority
```
**SAVE THIS!**

---

## Part 2: Install Dependencies

```bash
npm install mongoose cloudinary multer-storage-cloudinary dotenv
```

Update `package.json` to ensure you have:
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "cloudinary": "^1.41.0",
    "multer-storage-cloudinary": "^4.0.0",
    "dotenv": "^16.3.1"
  }
}
```

---

## Part 3: Create MongoDB Models

### File: `models/User.js`
```javascript
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'driver'],
    default: 'driver'
  },
  fullName: String,
  phoneNumber: String,
  isActive: {
    type: Boolean,
    default: true
  },
  securityQuestion: String,
  securityAnswer: String,
  profilePicture: String
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
```

### File: `models/Truck.js`
```javascript
const mongoose = require('mongoose');

const truckSchema = new mongoose.Schema({
  truckId: {
    type: String,
    required: true,
    unique: true
  },
  plateNumber: {
    type: String,
    required: true,
    unique: true
  },
  model: String,
  capacity: Number,
  status: {
    type: String,
    enum: ['available', 'in-use', 'maintenance'],
    default: 'available'
  },
  assignedDriver: {
    type: String,
    default: null
  },
  lastMaintenance: Date,
  nextMaintenance: Date,
  fuelLevel: Number,
  mileage: Number,
  notes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Truck', truckSchema);
```

### File: `models/Route.js`
```javascript
const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  routeId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  driverId: String,
  assignedDriver: String,
  path: {
    type: {
      type: String,
      enum: ['LineString'],
      default: 'LineString'
    },
    coordinates: [[Number]]
  },
  locations: [{
    lat: Number,
    lng: Number,
    name: String
  }],
  distance: Number,
  status: {
    type: String,
    enum: ['planned', 'active', 'pending', 'completed'],
    default: 'planned'
  },
  notes: String,
  completedAt: Date,
  completedBy: String,
  completionNotes: String,
  completionPhotos: [String],
  notificationSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Route', routeSchema);
```

### File: `models/Bin.js`
```javascript
const mongoose = require('mongoose');

const binSchema = new mongoose.Schema({
  binId: {
    type: String,
    required: true,
    unique: true
  },
  location: {
    lat: Number,
    lng: Number
  },
  address: String,
  type: {
    type: String,
    enum: ['residential', 'commercial', 'industrial'],
    default: 'residential'
  },
  capacity: Number,
  status: {
    type: String,
    enum: ['empty', 'half-full', 'full', 'overflowing'],
    default: 'empty'
  },
  lastCollection: Date,
  nextScheduled: Date,
  routeId: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Bin', binSchema);
```

### File: `models/Collection.js`
```javascript
const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
  binId: {
    type: String,
    required: true
  },
  driverId: {
    type: String,
    required: true
  },
  routeId: String,
  collectionDate: {
    type: Date,
    default: Date.now
  },
  wasteAmount: Number,
  wasteType: String,
  notes: String,
  photos: [String],
  status: {
    type: String,
    enum: ['pending', 'completed', 'skipped'],
    default: 'completed'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Collection', collectionSchema);
```

---

## Part 4: Update server.js

Replace the entire `server.js` with this:

```javascript
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kolekta', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// Connect to database
connectDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/trucks', require('./routes/trucks'));
app.use('/api/routes', require('./routes/routes'));
app.use('/api/bins', require('./routes/bins'));
app.use('/api/collections', require('./routes/collections'));
app.use('/api/tracking', require('./routes/tracking'));
app.use('/api/completions', require('./routes/completions'));
app.use('/api/profile', require('./routes/profile'));

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
});

module.exports = app;
```

---

## Part 5: Update tracking.js

Replace `routes/tracking.js` with:

```javascript
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const LiveLocation = require('../models/LiveLocation');
const User = require('../models/User');
const Route = require('../models/Route');
const Truck = require('../models/Truck');

// Update driver location
router.post('/update', authenticateToken, async (req, res) => {
  try {
    const { lat, lng, routeId, speed, heading } = req.body;
    const username = req.user.username;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }
    
    // Update or create location in MongoDB
    await LiveLocation.findOneAndUpdate(
      { username },
      {
        username,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        routeId,
        speed: speed || 0,
        heading: heading || 0,
        timestamp: new Date(),
        lastUpdate: Date.now()
      },
      { upsert: true, new: true }
    );
    
    res.json({
      message: 'Location updated',
      location: { lat, lng, speed, heading }
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
    
    // Get locations updated in last 5 minutes
    const activeLocations = await LiveLocation.getActive();
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
    
    const drivers = await User.find({ role: 'driver' });
    const allTrucks = [];
    
    for (const driver of drivers) {
      const assignedRoute = await Route.findOne({
        $or: [
          { driverId: driver.username },
          { assignedDriver: driver.username }
        ]
      });
      
      const assignedTruck = await Truck.findOne({
        $or: [
          { assignedDriver: driver.username },
          { driverId: driver.username }
        ]
      });
      
      if (assignedRoute && assignedTruck) {
        const liveLocation = await LiveLocation.findOne({ username: driver.username });
        
        let location;
        if (liveLocation && liveLocation.isFresh()) {
          location = {
            lat: liveLocation.lat,
            lng: liveLocation.lng,
            speed: liveLocation.speed,
            heading: liveLocation.heading,
            isLive: true,
            timestamp: liveLocation.timestamp
          };
        } else {
          const firstLocation = assignedRoute.locations && assignedRoute.locations[0];
          location = firstLocation ? {
            lat: firstLocation.lat,
            lng: firstLocation.lng,
            speed: 0,
            heading: 0,
            isLive: false,
            timestamp: null
          } : {
            lat: 7.0644,
            lng: 125.6078,
            speed: 0,
            heading: 0,
            isLive: false,
            timestamp: null
          };
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
    }
    
    res.json(allTrucks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific driver location
router.get('/driver/:username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    
    if (req.user.role !== 'admin' && req.user.username !== username) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const location = await LiveLocation.findOne({ username });
    
    if (!location || !location.isFresh()) {
      return res.status(404).json({ error: 'Location not found or stale' });
    }
    
    res.json(location);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear driver location
router.delete('/clear', authenticateToken, async (req, res) => {
  try {
    await LiveLocation.deleteOne({ username: req.user.username });
    res.json({ message: 'Location cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

---

## Part 6: Create .env File

Create `.env` in root directory:

```env
# MongoDB
MONGODB_URI=mongodb+srv://kolekta_admin:YOUR_PASSWORD@kolek-ta-cluster.xxxxx.mongodb.net/kolekta?retryWrites=true&w=majority

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-to-random-string

# Cloudinary (get from cloudinary.com)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Environment
NODE_ENV=development
PORT=3001
```

---

## Part 7: Test Locally

```bash
# Start MongoDB connection test
node -e "require('dotenv').config(); const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => console.log('✅ Connected')).catch(err => console.log('❌ Error:', err))"

# Start server
npm start
```

Visit: http://localhost:3001

---

## Part 8: Seed Initial Data

Create `scripts/seedDatabase.js`:

```javascript
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Truck = require('../models/Truck');
const Route = require('../models/Route');

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Clear existing data
    await User.deleteMany({});
    await Truck.deleteMany({});
    await Route.deleteMany({});
    
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    await User.create({
      username: 'admin',
      email: 'admin@kolekta.com',
      password: adminPassword,
      role: 'admin',
      fullName: 'System Administrator',
      isActive: true
    });
    
    // Create driver
    const driverPassword = await bcrypt.hash('driver123', 10);
    await User.create({
      username: 'cj',
      email: 'cj@kolekta.com',
      password: driverPassword,
      role: 'driver',
      fullName: 'Charles Stephen Adio',
      phoneNumber: '09091224161',
      isActive: true
    });
    
    // Create trucks
    await Truck.create([
      {
        truckId: 'TRUCK-001',
        plateNumber: 'ABC-1234',
        model: 'Isuzu Elf',
        capacity: 1000,
        status: 'available'
      },
      {
        truckId: 'TRUCK-002',
        plateNumber: 'XYZ-5678',
        model: 'Mitsubishi Canter',
        capacity: 1200,
        status: 'in-use',
        assignedDriver: 'cj'
      }
    ]);
    
    // Create route
    await Route.create({
      routeId: 'ROUTE-001',
      name: 'Downtown Collection Route',
      driverId: 'cj',
      assignedDriver: 'cj',
      path: {
        type: 'LineString',
        coordinates: [[126.2185, 6.9549], [126.22, 6.956], [126.217, 6.957]]
      },
      locations: [
        { lat: 6.9549, lng: 126.2185, name: 'Start Point' },
        { lat: 6.956, lng: 126.22, name: 'Collection Point 1' },
        { lat: 6.957, lng: 126.217, name: 'End Point' }
      ],
      distance: 2500,
      status: 'active'
    });
    
    console.log('✅ Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
```

Run it:
```bash
node scripts/seedDatabase.js
```

---

## Part 9: Deploy to Vercel

### Step 9.1: Push to GitHub
```bash
git add .
git commit -m "MongoDB migration complete"
git push origin vercel-migration
```

### Step 9.2: Deploy to Vercel
1. Go to vercel.com
2. Import your GitHub repo
3. Add environment variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `NODE_ENV=production`
4. Deploy!

---

## Part 10: Troubleshooting

### Issue: "Cannot connect to MongoDB"
**Solution:** Check connection string, verify IP whitelist

### Issue: "GPS not updating"
**Solution:** Check MongoDB indexes, verify LiveLocation model

### Issue: "Slow performance"
**Solution:** Add database indexes:
```javascript
// In MongoDB Atlas, create indexes:
users: { username: 1 }
trucks: { truckId: 1 }
routes: { routeId: 1, assignedDriver: 1 }
liveLocations: { username: 1, lastUpdate: -1 }
```

---

## ✅ Success Checklist

- [ ] MongoDB Atlas set up
- [ ] All models created
- [ ] server.js updated
- [ ] tracking.js updated
- [ ] Local testing passed
- [ ] Database seeded
- [ ] Deployed to Vercel
- [ ] Production testing passed

---

## 🎓 Final Notes

This migration is complex. Take your time, test thoroughly, and don't hesitate to ask for help when stuck.

**Good luck!** 🚀
