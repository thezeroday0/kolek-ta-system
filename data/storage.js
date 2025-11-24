const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname);
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TRUCKS_FILE = path.join(DATA_DIR, 'trucks.json');
const ROUTES_FILE = path.join(DATA_DIR, 'routes.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize files if they don't exist
function initializeFile(filePath, defaultData) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
  }
}

// Read data from file
function readData(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return [];
  }
}

// Write data to file
function writeData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    return false;
  }
}

// Users storage
const usersStorage = {
  getAll: () => readData(USERS_FILE),
  save: (users) => writeData(USERS_FILE, users),
  findByUsername: (username) => {
    const users = readData(USERS_FILE);
    return users.find(u => u.username === username);
  },
  add: (user) => {
    const users = readData(USERS_FILE);
    users.push(user);
    return writeData(USERS_FILE, users);
  },
  update: (username, updates) => {
    const users = readData(USERS_FILE);
    const index = users.findIndex(u => u.username === username);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      return writeData(USERS_FILE, users);
    }
    return false;
  },
  delete: (username) => {
    const users = readData(USERS_FILE);
    const filtered = users.filter(u => u.username !== username);
    return writeData(USERS_FILE, filtered);
  }
};

// Trucks storage
const trucksStorage = {
  getAll: () => readData(TRUCKS_FILE),
  save: (trucks) => writeData(TRUCKS_FILE, trucks),
  findById: (id) => {
    const trucks = readData(TRUCKS_FILE);
    return trucks.find(t => t._id === id || t.truckId === id);
  },
  add: (truck) => {
    const trucks = readData(TRUCKS_FILE);
    trucks.push(truck);
    return writeData(TRUCKS_FILE, trucks);
  },
  update: (id, updates) => {
    const trucks = readData(TRUCKS_FILE);
    const index = trucks.findIndex(t => t._id === id || t.truckId === id);
    if (index !== -1) {
      trucks[index] = { ...trucks[index], ...updates };
      return writeData(TRUCKS_FILE, trucks);
    }
    return false;
  },
  delete: (id) => {
    const trucks = readData(TRUCKS_FILE);
    const filtered = trucks.filter(t => t._id !== id && t.truckId !== id);
    return writeData(TRUCKS_FILE, filtered);
  }
};

// Routes storage
const routesStorage = {
  getAll: () => readData(ROUTES_FILE),
  save: (routes) => writeData(ROUTES_FILE, routes),
  findById: (id) => {
    const routes = readData(ROUTES_FILE);
    return routes.find(r => r._id === id || r.routeId === id);
  },
  add: (route) => {
    const routes = readData(ROUTES_FILE);
    routes.push(route);
    return writeData(ROUTES_FILE, routes);
  },
  update: (id, updates) => {
    const routes = readData(ROUTES_FILE);
    const index = routes.findIndex(r => r._id === id || r.routeId === id);
    if (index !== -1) {
      routes[index] = { ...routes[index], ...updates };
      return writeData(ROUTES_FILE, routes);
    }
    return false;
  },
  delete: (id) => {
    const routes = readData(ROUTES_FILE);
    const filtered = routes.filter(r => r._id !== id && r.routeId !== id);
    return writeData(ROUTES_FILE, filtered);
  }
};

// Initialize files with default data
function initialize() {
  // Only initialize if files are empty
  const currentUsers = readData(USERS_FILE);
  if (currentUsers.length === 0) {
    const mockUsers = require('./mock-users');
    writeData(USERS_FILE, mockUsers);
    console.log('✅ Initialized users.json with default data');
  }
  
  const currentTrucks = readData(TRUCKS_FILE);
  if (currentTrucks.length === 0) {
    writeData(TRUCKS_FILE, [
    {
      _id: '1',
      truckId: 'TRUCK-001',
      plateNumber: 'ABC-1234',
      model: 'Isuzu Elf',
      capacity: 1000,
      status: 'available',
      assignedDriver: null,
      lastMaintenance: '2024-01-15',
      nextMaintenance: '2024-04-15',
      fuelLevel: 85,
      mileage: 15420,
      notes: 'Good condition'
    },
    {
      _id: '2',
      truckId: 'TRUCK-002',
      plateNumber: 'XYZ-5678',
      model: 'Mitsubishi Canter',
      capacity: 1200,
      status: 'in-use',
      assignedDriver: 'driver1',
      lastMaintenance: '2024-02-01',
      nextMaintenance: '2024-05-01',
      fuelLevel: 60,
      mileage: 22350,
      notes: 'Assigned to Juan Dela Cruz'
    }
    ]);
    console.log('✅ Initialized trucks.json with default data');
  }
  
  const currentRoutes = readData(ROUTES_FILE);
  if (currentRoutes.length === 0) {
    writeData(ROUTES_FILE, [
    {
      _id: '1',
      routeId: 'ROUTE-001',
      name: 'Downtown Collection Route',
      path: {
        type: 'LineString',
        coordinates: [
          [126.2185, 6.9549],
          [126.2200, 6.9560],
          [126.2170, 6.9570]
        ]
      },
      distance: 2500,
      status: 'planned',
      notes: 'Main downtown area collection'
    }
    ]);
    console.log('✅ Initialized routes.json with default data');
  }
}

module.exports = {
  initialize,
  usersStorage,
  trucksStorage,
  routesStorage
};
