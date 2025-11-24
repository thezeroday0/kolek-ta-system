require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const { initialize } = require('./data/storage');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Check if using mock authentication
const useMockAuth = process.env.USE_MOCK_AUTH === 'true';

// MongoDB Connection
if (!useMockAuth) {
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kolekta')
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => {
      console.error('❌ MongoDB connection error:', err.message);
      console.log('💡 Tip: Set USE_MOCK_AUTH=true in .env to use mock authentication');
    });
} else {
  console.log('📝 Mock authentication enabled - no database needed');
  // Initialize persistent storage
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
