// Run this script once to create an admin user
// Usage: node create-admin.js

const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const USERS_PATH = path.join(__dirname, 'data/users.json');

async function createAdmin() {
  // Hash the password
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  // Read existing users or create empty array
  let users = [];
  try {
    const data = fs.readFileSync(USERS_PATH, 'utf8');
    users = JSON.parse(data);
  } catch (err) {
    console.log('No existing users.json, creating new one...');
  }
  
  // Check if admin already exists
  const existingAdmin = users.find(u => u.username === 'admin');
  if (existingAdmin) {
    console.log('Admin user already exists!');
    return;
  }
  
  // Create admin user
  const adminUser = {
    id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
    username: 'admin',
    email: 'admin@sportstore.com',
    password: hashedPassword,
    fullname: 'Administrator',
    description: 'Site Administrator',
    profilePicture: 'https://via.placeholder.com/150',
    role: 'admin',
    locked: false,
    createdAt: new Date().toISOString(),
    resetToken: null,
    resetTokenExpiry: null
  };
  
  users.push(adminUser);
  
  // Ensure data directory exists
  const dataDir = path.dirname(USERS_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Save to file
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
  
  console.log('✅ Admin user created successfully!');
  console.log('');
  console.log('Login credentials:');
  console.log('  URL:      http://localhost:3000/login');
  console.log('  Username: admin');
  console.log('  Password: admin123');
  console.log('');
  console.log('Admin panel: http://localhost:3000/admin');
}

createAdmin().catch(console.error);
