const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Storage } = require('../utils/storage');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';
const usersStorage = new Storage('users.json');

/**
 * Generate JWT token
 */
function generateToken(username) {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Hash password
 */
async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

/**
 * Compare password
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Authenticate user
 */
async function authenticateUser(username, password) {
  const users = await usersStorage.read();
  
  if (!users || !users.admin || users.admin.username !== username) {
    return null;
  }

  const isValid = await comparePassword(password, users.admin.passwordHash);
  
  if (!isValid) {
    return null;
  }

  return { username: users.admin.username };
}

/**
 * Set admin password
 */
async function setAdminPassword(newPassword) {
  const passwordHash = await hashPassword(newPassword);
  
  await usersStorage.update(users => {
    if (!users.admin) {
      users.admin = { username: 'admin' };
    }
    users.admin.passwordHash = passwordHash;
    users.admin.updatedAt = new Date().toISOString();
    return users;
  });
}

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  authenticateUser,
  setAdminPassword
};
