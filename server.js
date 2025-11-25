require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initialize } = require('./data/storage');
const { connectToDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// Ensure MongoDB connection for API routes (serverless optimization)
app.use('/api/*', async (req, res, next) => {
  if (!useMockAuth) {
    try {
      await connectToDatabase();
    } catch (error) {
      console.error('Failed to connect to database:', error);
      return res.status(503).json({ error: 'Database connection failed. Please try again.' });
    }
  }
  next();
});

// Check if using mock authentication
const useMockAuth = process.env.USE_MOCK_AUTH === 'true';

// MongoDB Connection
if (!useMockAuth) {
  // Connect to MongoDB with caching for serverless
  connectToDatabase()
    .then(() => {
      console.log('✅ Database connection established');
    })
    .catch(err => {
      console.error('❌ Database connection failed:', err.message);
      console.log('💡 Tip: Set USE_MOCK_AUTH=true in .env to use mock authentication');
    });
} else {
  console.log('📝 Mock authentication enabled - no database needed');
  initialize();
  console.log('💾 Persistent storage initialized');
}

// Routes
if (useMockAuth) {
  console.log('⚠️  Using MOCK authentication (no database required)');
  app.use('/api/auth', require('./routes/auth-mock'));
} else {
  app.use('/api/auth', require('./routes/auth'));
}
app.use('/api/users', require('./routes/users'));
app.use('/api/trucks', require('./routes/trucks'));
app.use('/api/collections', require('./routes/collections'));
if (useMockAuth) {
  app.use('/api/routes', require('./routes/routes-mock'));
} else {
  app.use('/api/routes', require('./routes/routes'));
}
app.use('/api/bins', require('./routes/bins'));
app.use('/api/completions', require('./routes/completions'));
app.use('/api/tracking', require('./routes/tracking'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/route-completion', require('./routes/route-completion'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/mobile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mobile.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Kolek-Ta server running on port ${PORT}`);
  console.log(`Access from this computer: http://localhost:${PORT}`);
  console.log(`Access from other devices: http://YOUR-IP-ADDRESS:${PORT}`);
  console.log(`\nTo find your IP address, run: ipconfig`);
});
