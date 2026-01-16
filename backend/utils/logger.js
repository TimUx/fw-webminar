const fs = require('fs').promises;
const path = require('path');

const LOG_FILE = path.join(process.env.DATA_DIR || path.join(__dirname, '../../data'), 'audit.log');

/**
 * Audit logging utility
 */
async function logAudit(action, user, message, metadata = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    action,
    user,
    message,
    ...metadata
  };
  
  const logLine = JSON.stringify(logEntry) + '\n';
  
  try {
    await fs.appendFile(LOG_FILE, logLine, 'utf-8');
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

/**
 * Read audit logs
 */
async function readAuditLogs(limit = 100) {
  try {
    const content = await fs.readFile(LOG_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line);
    const logs = lines.map(line => JSON.parse(line));
    return logs.slice(-limit).reverse();
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

module.exports = { logAudit, readAuditLogs };
