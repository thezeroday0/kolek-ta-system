# 🚀 Vercel + MongoDB Deployment Guide

## Prerequisites

Before deploying, you need:
1. ✅ GitHub account
2. ✅ Vercel account (free)
3. ✅ MongoDB Atlas account (free)
4. ✅ Cloudinary account (free) - for image uploads

---

## Part 1: Set Up MongoDB Atlas (15 minutes)

### Step 1: Create MongoDB Account
1. Go to https://www.mongodb.com/cloud/atlas
2. Click "Try Free"
3. Sign up with Google or email

### Step 2: Create Cluster
1. Choose "FREE" tier (M0 Sandbox)
2. Select region closest to you (Singapore for Philippines)
3. Cluster name: "kolek-ta-cluster"
4. Click "Create Cluster"

### Step 3: Create Database User
1. Click "Database Access" in left sidebar
2. Click "Add New Database User"
3. Username: `kolekta_admin`
4. Password: Generate secure password (SAVE THIS!)
5. Database User Privileges: "Read and write to any database"
6. Click "Add User"

### Step 4: Whitelist IP Addresses
1. Click "Network Access" in left sidebar
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (0.0.0.0/0)
4. Click "Confirm"

### Step 5: Get Connection String
1. Click "Database" in left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string:
```
mongodb+srv://kolekta_admin:<password>@kolek-ta-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
```
5. Replace `<password>` with your actual password
6. **SAVE THIS CONNECTION STRING!**

---

## Part 2: Set Up Cloudinary (10 minutes)

### Why Cloudinary?
Vercel doesn't support file storage. We need cloud storage for:
- Profile pictures
- Completion proof photos

### Step 1: Create Account
1. Go to https://cloudinary.com
2. Sign up for free account

### Step 2: Get Credentials
1. Go to Dashboard
2. Copy these values:
   - Cloud Name: `dxxxxx`
   - API Key: `123456789012345`
   - API Secret: `abcdefghijklmnopqrstuvwxyz`
3. **SAVE THESE!**

---

## Part 3: Prepare Code for Vercel

### Files Already Created:
✅ `models/LiveLocation.js` - GPS tracking model
✅ Modified `routes/tracking.js` - Uses MongoDB
✅ `vercel.json` - Vercel configuration

### What You Need to Do:

#### 1. Install Additional Dependencies
```bash
npm install cloudinary multer-storage-cloudinary
```

#### 2. Create `.env` File (for local testing)
```env
MONGODB_URI=mongodb+srv://kolekta_admin:YOUR_PASSWORD@kolek-ta-cluster.xxxxx.mongodb.net/kolekta?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this
CLOUDINARY_CLOUD_NAME=dxxxxx
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz
NODE_ENV=production
```

#### 3. Create `.gitignore`
```
node_modules/
.env
.vercel
data/*.json
public/uploads/
```

---

## Part 4: Push to GitHub

### Step 1: Initialize Git (if not already)
```bash
git init
git add .
git commit -m "Prepare for Vercel deployment"
```

### Step 2: Create GitHub Repository
1. Go to https://github.com
2. Click "New repository"
3. Name: `kolek-ta-system`
4. Make it Private (for thesis)
5. Click "Create repository"

### Step 3: Push Code
```bash
git remote add origin https://github.com/YOUR_USERNAME/kolek-ta-system.git
git branch -M main
git push -u origin main
```

---

## Part 5: Deploy to Vercel

### Step 1: Connect GitHub
1. Go to https://vercel.com
2. Sign up with GitHub
3. Click "Add New Project"
4. Import your `kolek-ta-system` repository

### Step 2: Configure Environment Variables
In Vercel project settings, add these:

```
MONGODB_URI = mongodb+srv://kolekta_admin:PASSWORD@...
JWT_SECRET = your-super-secret-jwt-key
CLOUDINARY_CLOUD_NAME = dxxxxx
CLOUDINARY_API_KEY = 123456789012345
CLOUDINARY_API_SECRET = abcdefghijklmnopqrstuvwxyz
NODE_ENV = production
```

### Step 3: Deploy
1. Click "Deploy"
2. Wait 2-5 minutes
3. You'll get a URL: `https://kolek-ta-system.vercel.app`

---

## Part 6: Initialize Database

### Step 1: Create Initial Admin User
Use MongoDB Compass or Atlas UI to insert:

```json
{
  "username": "admin",
  "email": "admin@kolekta.com",
  "password": "$2a$10$...", // Use bcrypt to hash "admin123"
  "role": "admin",
  "fullName": "System Administrator",
  "isActive": true
}
```

### Step 2: Test Login
1. Go to `https://your-app.vercel.app/login.html`
2. Login with admin credentials
3. Create drivers, trucks, routes

---

## Part 7: Testing

### Test Checklist:
- [ ] Admin can login
- [ ] Admin can create drivers
- [ ] Admin can create trucks
- [ ] Admin can create routes
- [ ] Driver can login
- [ ] Driver can see assignments
- [ ] Driver can upload profile picture
- [ ] Driver can mark route complete with photos
- [ ] Admin receives notifications
- [ ] GPS tracking works (may be slower)
- [ ] Map shows truck locations

---

## Troubleshooting

### Issue: "Cannot connect to database"
**Solution:** Check MongoDB connection string and whitelist IPs

### Issue: "File upload fails"
**Solution:** Verify Cloudinary credentials

### Issue: "GPS tracking not working"
**Solution:** Check browser console for errors, verify MongoDB connection

### Issue: "Vercel function timeout"
**Solution:** Optimize database queries, add indexes

---

## Performance Optimization

### 1. Add Database Indexes
```javascript
// In MongoDB Atlas, create indexes:
- users: { username: 1 }
- trucks: { truckId: 1 }
- routes: { routeId: 1, assignedDriver: 1 }
- liveLocations: { username: 1, lastUpdate: -1 }
```

### 2. Enable Caching
Add to vercel.json:
```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "s-maxage=10, stale-while-revalidate"
        }
      ]
    }
  ]
}
```

---

## Cost Estimate (Free Tier Limits)

### MongoDB Atlas Free (M0):
- Storage: 512 MB
- RAM: Shared
- Connections: 500
- **Enough for:** 50-100 users

### Vercel Free:
- Bandwidth: 100 GB/month
- Serverless Function Executions: 100 GB-hours
- **Enough for:** Thesis demo + testing

### Cloudinary Free:
- Storage: 25 GB
- Transformations: 25,000/month
- **Enough for:** 1000+ photos

---

## Next Steps After Deployment

1. **Test thoroughly** on mobile devices
2. **Document** the deployment process for thesis
3. **Prepare demo** scenarios
4. **Backup** MongoDB data regularly
5. **Monitor** Vercel logs for errors

---

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check MongoDB Atlas logs
3. Check browser console
4. Verify environment variables

Good luck with your thesis! 🎓🚀
