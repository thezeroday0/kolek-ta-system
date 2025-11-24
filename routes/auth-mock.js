const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { usersStorage } = require('../data/storage');

const JWT_SECRET = process.env.JWT_SECRET || 'kolek-ta-secret-key-2024';

// Mock face data storage
const faceData = {};

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    const allUsers = usersStorage.getAll();
    const user = allUsers.find(u => 
      u.username === username && 
      u.role === role && 
      u.isActive
    );
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password (handle both hashed and plain text for backward compatibility)
    const isValidPassword = user.password.startsWith('$2a$') || user.password.startsWith('$2b$')
      ? await bcrypt.compare(password, user.password)
      : user.password === password;
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { userId: user._id, role: user.role, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        hasFaceData: !!faceData[user.username]
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Face verification login
router.post('/login/face', async (req, res) => {
  try {
    const { username, faceDescriptor } = req.body;
    
    const user = mockUsers.find(u => 
      u.username === username && 
      u.role === 'driver' && 
      u.isActive
    );
    
    if (!user || !faceData[username]) {
      return res.status(401).json({ error: 'Face data not found. Please register your face first.' });
    }
    
    // Simple face matching (in real app, use proper face recognition)
    const storedDescriptor = faceData[username];
    const distance = calculateDistance(faceDescriptor, storedDescriptor);
    const threshold = 0.6;
    
    if (distance > threshold) {
      return res.status(401).json({ error: 'Face verification failed. Please try again.' });
    }
    
    const token = jwt.sign(
      { userId: user._id, role: user.role, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register face data
router.post('/register-face', async (req, res) => {
  try {
    const { username, faceDescriptor } = req.body;
    
    const user = mockUsers.find(u => u.username === username && u.role === 'driver');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Store face descriptor
    faceData[username] = faceDescriptor;
    
    res.json({ message: 'Face data registered successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, role } = req.body;
    
    const user = mockUsers.find(u => u.email === email && u.role === role);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const resetToken = 'mock-reset-token-' + Date.now();
    
    res.json({ 
      message: 'Reset token generated',
      resetToken,
      resetLink: `http://localhost:3001/reset-password.html?token=${resetToken}`,
      note: 'This is a mock system. In production, this would send an email.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !token.startsWith('mock-reset-token-')) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    
    // In mock system, just return success
    res.json({ 
      message: 'Password reset successfully',
      note: 'This is a mock system. Password not actually changed.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function
function calculateDistance(desc1, desc2) {
  let sum = 0;
  for (let i = 0; i < Math.min(desc1.length, desc2.length); i++) {
    sum += Math.pow(desc1[i] - desc2[i], 2);
  }
  return Math.sqrt(sum);
}

module.exports = router;


// Forgot Password - Get Security Question
router.post('/forgot-password/question', async (req, res) => {
  try {
    const { username, role } = req.body;
    
    const allUsers = usersStorage.getAll();
    const user = allUsers.find(u => 
      u.username === username && 
      u.role === role
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.securityQuestion) {
      return res.status(400).json({ error: 'No security question set for this user' });
    }
    
    res.json({
      username: user.username,
      securityQuestion: user.securityQuestion
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Forgot Password - Verify Security Answer
router.post('/forgot-password/verify', async (req, res) => {
  try {
    const { username, role, answer } = req.body;
    
    const allUsers = usersStorage.getAll();
    const user = allUsers.find(u => 
      u.username === username && 
      u.role === role
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Case-insensitive comparison
    if (user.securityAnswer.toLowerCase() !== answer.toLowerCase()) {
      return res.status(401).json({ error: 'Incorrect answer' });
    }
    
    // Generate temporary token for password reset
    const resetToken = jwt.sign(
      { userId: user._id, username: user.username, purpose: 'password-reset' },
      JWT_SECRET,
      { expiresIn: '15m' } // 15 minutes to reset password
    );
    
    res.json({
      message: 'Answer verified',
      resetToken
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Forgot Password - Reset Password
router.post('/forgot-password/reset', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    
    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, JWT_SECRET);
      if (decoded.purpose !== 'password-reset') {
        return res.status(403).json({ error: 'Invalid reset token' });
      }
    } catch (error) {
      return res.status(403).json({ error: 'Reset token expired or invalid' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    usersStorage.update(decoded.username, { password: hashedPassword });
    
    res.json({
      message: 'Password reset successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
