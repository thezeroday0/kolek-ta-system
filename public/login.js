// Use relative URL so it works on any device
const API_URL = '/api';

let faceApiLoaded = false;
let stream = null;

// Role card selection
document.querySelectorAll('.role-card').forEach(card => {
  card.addEventListener('click', () => {
    const role = card.dataset.role;
    showLoginForm(role);
  });
});

function showLoginForm(role) {
  document.getElementById('roleSelectionScreen').style.display = 'none';
  document.querySelectorAll('.login-form').forEach(f => f.classList.remove('active'));
  document.getElementById(`${role}LoginForm`).classList.add('active');
  clearError();
}

function showRoleSelection() {
  document.getElementById('roleSelectionScreen').style.display = 'block';
  document.querySelectorAll('.login-form').forEach(f => f.classList.remove('active'));
  stopCamera();
  clearError();
}

// Driver login method tabs
document.querySelectorAll('.method-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const method = tab.dataset.method;
    
    document.querySelectorAll('.method-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    document.querySelectorAll('.method-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`driver${method === 'manual' ? 'Manual' : 'Face'}Form`).classList.add('active');
    
    if (method === 'face') {
      initFaceVerification();
    } else {
      stopCamera();
    }
    
    clearError();
  });
});

// Admin login
document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('adminUsername').value;
  const password = document.getElementById('adminPassword').value;
  
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role: 'admin' })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = 'index.html';
    } else {
      showError(data.error || 'Login failed');
    }
  } catch (error) {
    showError('Connection error. Please try again.');
  }
});

// Driver manual login
document.getElementById('driverManualForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('driverUsername').value;
  const password = document.getElementById('driverPassword').value;
  
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role: 'driver' })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = 'index.html';
    } else {
      showError(data.error || 'Login failed');
    }
  } catch (error) {
    showError('Connection error. Please try again.');
  }
});

// Face verification
async function initFaceVerification() {
  const statusDiv = document.getElementById('faceStatus');
  
  statusDiv.innerHTML = '<span class="face-status-icon">⏳</span><span>Loading face recognition...</span>';
  statusDiv.className = 'face-status detecting';
  
  if (!faceApiLoaded) {
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
      faceApiLoaded = true;
    } catch (error) {
      console.error('Face API loading error:', error);
      statusDiv.innerHTML = '<span class="face-status-icon">❌</span><span>Face recognition not available</span>';
      statusDiv.className = 'face-status error';
      return;
    }
  }
  
  try {
    stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      } 
    });
    const video = document.getElementById('video');
    video.srcObject = stream;
    
    video.addEventListener('loadeddata', () => {
      statusDiv.innerHTML = '<span class="face-status-icon">👤</span><span>Position your face in the frame</span>';
      statusDiv.className = 'face-status';
      startFaceDetection();
    });
  } catch (error) {
    statusDiv.innerHTML = '<span class="face-status-icon">❌</span><span>Camera access denied</span>';
    statusDiv.className = 'face-status error';
  }
}

function stopCamera() {
  stopFaceDetection();
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  const video = document.getElementById('video');
  if (video) {
    video.srcObject = null;
  }
}

// Real-time face detection
let detectionInterval = null;

async function startFaceDetection() {
  const video = document.getElementById('video');
  const outline = document.getElementById('faceOutline');
  const statusDiv = document.getElementById('faceStatus');
  
  if (detectionInterval) clearInterval(detectionInterval);
  
  detectionInterval = setInterval(async () => {
    try {
      const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions());
      
      if (detection) {
        outline.className = 'face-outline detecting';
        statusDiv.innerHTML = '<span class="face-status-icon">✓</span><span>Face detected! Ready to verify</span>';
        statusDiv.className = 'face-status detecting';
      } else {
        outline.className = 'face-outline';
        statusDiv.innerHTML = '<span class="face-status-icon">👤</span><span>Position your face in the frame</span>';
        statusDiv.className = 'face-status';
      }
    } catch (error) {
      console.error('Detection error:', error);
    }
  }, 500);
}

function stopFaceDetection() {
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
  }
}

document.getElementById('captureFaceBtn').addEventListener('click', async () => {
  const username = document.getElementById('faceUsername').value;
  if (!username) {
    showError('Please enter username');
    return;
  }
  
  const video = document.getElementById('video');
  const outline = document.getElementById('faceOutline');
  const statusDiv = document.getElementById('faceStatus');
  
  stopFaceDetection();
  
  statusDiv.innerHTML = '<span class="face-status-icon">🔍</span><span>Detecting face...</span>';
  statusDiv.className = 'face-status detecting';
  outline.className = 'face-outline detecting';
  
  try {
    const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    if (!detection) {
      outline.className = 'face-outline error';
      statusDiv.innerHTML = '<span class="face-status-icon">❌</span><span>No face detected. Please try again.</span>';
      statusDiv.className = 'face-status error';
      setTimeout(() => startFaceDetection(), 2000);
      return;
    }
    
    statusDiv.innerHTML = '<span class="face-status-icon">⏳</span><span>Verifying identity...</span>';
    statusDiv.className = 'face-status detecting';
    
    const response = await fetch(`${API_URL}/auth/login/face`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        faceDescriptor: Array.from(detection.descriptor)
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      outline.className = 'face-outline success';
      statusDiv.innerHTML = '<span class="face-status-icon">✅</span><span>Verification successful!</span>';
      statusDiv.className = 'face-status success';
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1500);
    } else {
      outline.className = 'face-outline error';
      statusDiv.innerHTML = `<span class="face-status-icon">❌</span><span>${data.error || 'Verification failed'}</span>`;
      statusDiv.className = 'face-status error';
      setTimeout(() => startFaceDetection(), 2000);
    }
  } catch (error) {
    outline.className = 'face-outline error';
    statusDiv.innerHTML = '<span class="face-status-icon">❌</span><span>Verification error. Please try again.</span>';
    statusDiv.className = 'face-status error';
    setTimeout(() => startFaceDetection(), 2000);
  }
});

document.getElementById('registerFaceBtn').addEventListener('click', async () => {
  const username = document.getElementById('faceUsername').value;
  if (!username) {
    showError('Please enter username');
    return;
  }
  
  const video = document.getElementById('video');
  const outline = document.getElementById('faceOutline');
  const statusDiv = document.getElementById('faceStatus');
  
  stopFaceDetection();
  
  statusDiv.innerHTML = '<span class="face-status-icon">📸</span><span>Capturing face data...</span>';
  statusDiv.className = 'face-status detecting';
  outline.className = 'face-outline detecting';
  
  try {
    const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    if (!detection) {
      outline.className = 'face-outline error';
      statusDiv.innerHTML = '<span class="face-status-icon">❌</span><span>No face detected. Please try again.</span>';
      statusDiv.className = 'face-status error';
      setTimeout(() => startFaceDetection(), 2000);
      return;
    }
    
    const response = await fetch(`${API_URL}/auth/register-face`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        faceDescriptor: Array.from(detection.descriptor)
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      outline.className = 'face-outline success';
      statusDiv.innerHTML = '<span class="face-status-icon">✅</span><span>Face registered successfully!</span>';
      statusDiv.className = 'face-status success';
      setTimeout(() => startFaceDetection(), 2000);
    } else {
      outline.className = 'face-outline error';
      statusDiv.innerHTML = `<span class="face-status-icon">❌</span><span>${data.error || 'Registration failed'}</span>`;
      statusDiv.className = 'face-status error';
      setTimeout(() => startFaceDetection(), 2000);
    }
  } catch (error) {
    outline.className = 'face-outline error';
    statusDiv.innerHTML = '<span class="face-status-icon">❌</span><span>Registration error. Please try again.</span>';
    statusDiv.className = 'face-status error';
    setTimeout(() => startFaceDetection(), 2000);
  }
});

// Forgot password
function showForgotPassword(role) {
  document.getElementById('forgotRole').value = role;
  document.getElementById('forgotModal').style.display = 'block';
  document.getElementById('forgotMessage').style.display = 'none';
}

document.querySelector('.close').addEventListener('click', () => {
  document.getElementById('forgotModal').style.display = 'none';
});

document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('forgotEmail').value;
  const role = document.getElementById('forgotRole').value;
  
  try {
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role })
    });
    
    const data = await response.json();
    const messageDiv = document.getElementById('forgotMessage');
    
    if (response.ok) {
      messageDiv.textContent = `Reset link sent! Check: ${data.resetLink}`;
      messageDiv.className = 'success';
      messageDiv.style.display = 'block';
    } else {
      messageDiv.textContent = data.error || 'Failed to send reset link';
      messageDiv.className = 'error';
      messageDiv.style.display = 'block';
    }
  } catch (error) {
    const messageDiv = document.getElementById('forgotMessage');
    messageDiv.textContent = 'Connection error. Please try again.';
    messageDiv.className = 'error';
    messageDiv.style.display = 'block';
  }
});

// Helper functions
function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  errorDiv.textContent = message;
  errorDiv.classList.add('show');
  
  setTimeout(() => {
    errorDiv.classList.remove('show');
  }, 5000);
}

function clearError() {
  document.getElementById('errorMessage').classList.remove('show');
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  stopCamera();
});


// Forgot Password Functions
let currentResetToken = null;
let currentResetUsername = null;
let currentResetRole = null;

function showForgotPassword(role) {
  event.preventDefault();
  document.getElementById('forgotModal').style.display = 'block';
  document.getElementById('forgotRole').value = role;
  currentResetRole = role;
  resetForgotModal();
}

function closeForgotModal() {
  document.getElementById('forgotModal').style.display = 'none';
  resetForgotModal();
}

function resetForgotModal() {
  document.getElementById('forgotStep1').style.display = 'block';
  document.getElementById('forgotStep2').style.display = 'none';
  document.getElementById('forgotStep3').style.display = 'none';
  document.getElementById('forgotMessage').innerHTML = '';
  document.getElementById('forgotUsername').value = '';
  document.getElementById('securityAnswer').value = '';
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';
  currentResetToken = null;
  currentResetUsername = null;
}

// Step 1: Get security question
document.getElementById('forgotUsernameForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('forgotUsername').value;
  const role = currentResetRole;
  
  try {
    const response = await fetch(`${API_URL}/auth/forgot-password/question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, role })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      currentResetUsername = username;
      document.getElementById('securityQuestion').value = data.securityQuestion;
      document.getElementById('forgotStep1').style.display = 'none';
      document.getElementById('forgotStep2').style.display = 'block';
      document.getElementById('forgotMessage').innerHTML = '';
    } else {
      document.getElementById('forgotMessage').innerHTML = `<p style="color: #f44336;">${data.error}</p>`;
    }
  } catch (error) {
    document.getElementById('forgotMessage').innerHTML = `<p style="color: #f44336;">Error: ${error.message}</p>`;
  }
});

// Step 2: Verify security answer
document.getElementById('forgotSecurityForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const answer = document.getElementById('securityAnswer').value;
  
  try {
    const response = await fetch(`${API_URL}/auth/forgot-password/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: currentResetUsername, 
        role: currentResetRole,
        answer 
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      currentResetToken = data.resetToken;
      document.getElementById('forgotStep2').style.display = 'none';
      document.getElementById('forgotStep3').style.display = 'block';
      document.getElementById('forgotMessage').innerHTML = '';
    } else {
      document.getElementById('forgotMessage').innerHTML = `<p style="color: #f44336;">${data.error}</p>`;
    }
  } catch (error) {
    document.getElementById('forgotMessage').innerHTML = `<p style="color: #f44336;">Error: ${error.message}</p>`;
  }
});

// Step 3: Reset password
document.getElementById('forgotNewPasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  if (newPassword !== confirmPassword) {
    document.getElementById('forgotMessage').innerHTML = '<p style="color: #f44336;">Passwords do not match!</p>';
    return;
  }
  
  if (newPassword.length < 6) {
    document.getElementById('forgotMessage').innerHTML = '<p style="color: #f44336;">Password must be at least 6 characters!</p>';
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/auth/forgot-password/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        resetToken: currentResetToken,
        newPassword 
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      document.getElementById('forgotMessage').innerHTML = '<p style="color: #4caf50;">✓ Password reset successfully! You can now login with your new password.</p>';
      setTimeout(() => {
        closeForgotModal();
        showRoleSelection();
      }, 2000);
    } else {
      document.getElementById('forgotMessage').innerHTML = `<p style="color: #f44336;">${data.error}</p>`;
    }
  } catch (error) {
    document.getElementById('forgotMessage').innerHTML = `<p style="color: #f44336;">Error: ${error.message}</p>`;
  }
});

// Close modal when clicking outside
window.onclick = function(event) {
  const modal = document.getElementById('forgotModal');
  if (event.target == modal) {
    closeForgotModal();
  }
};


// Toggle Password Visibility (Sharingan Style!)
function togglePassword(inputId, button) {
  const input = document.getElementById(inputId);
  const eyeIcon = button.querySelector('.eye-icon');
  
  if (input.type === 'password') {
    // Show password
    input.type = 'text';
    button.classList.add('active');
    eyeIcon.textContent = '👁️'; // Keep eye open
    
    // Add Sharingan effect
    button.style.animation = 'sharingan-spin 2s linear infinite';
  } else {
    // Hide password
    input.type = 'password';
    button.classList.remove('active');
    eyeIcon.textContent = '👁️';
    
    // Remove animation
    button.style.animation = '';
  }
}
