require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Truck = require('../models/Truck');
const Route = require('../models/Route');

async function seedDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Truck.deleteMany({});
    await Route.deleteMany({});
    console.log('✅ Data cleared');
    
    // Create admin user
    console.log('👤 Creating admin user...');
    await User.create({
      username: 'admin',
      email: 'admin@kolekta.com',
      password: 'admin123',
      role: 'admin',
      fullName: 'Vience Malintad',
      isActive: true
    });
    console.log('✅ Admin user created');
    
    // Create driver
    console.log('👤 Creating driver...');
    const driver = await User.create({
      username: 'cj',
      email: 'charlesstephenadio860@gmail.com',
      password: 'driver123',
      role: 'driver',
      fullName: 'charles stephen adio',
      phoneNumber: '09091224161',
      isActive: true
    });
    console.log('✅ Driver created');
    
    // Create trucks
    console.log('🚛 Creating trucks...');
    await Truck.create([
      {
        truckId: 'TRUCK-001',
        plateNumber: 'ABC-1234',
        model: 'Isuzu Elf',
        capacity: 1000,
        status: 'available',
        fuelLevel: 85,
        mileage: 15420
      },
      {
        truckId: 'TRUCK-002',
        plateNumber: 'XYZ-5678',
        model: 'Mitsubishi Canter',
        capacity: 1200,
        status: 'in-use',
        assignedDriver: driver._id,
        fuelLevel: 60,
        mileage: 22350
      }
    ]);
    console.log('✅ Trucks created');
    
    // Create route
    console.log('📍 Creating route...');
    await Route.create({
      routeId: 'ROUTE-001',
      name: 'Downtown Collection Route',
      driverId: driver._id,
      assignedDriver: driver._id,
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
    console.log('✅ Route created');
    
    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📝 Login credentials:');
    console.log('Admin: username=admin, password=admin123');
    console.log('Driver: username=cj, password=driver123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
