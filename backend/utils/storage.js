const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');

/**
 * Storage utility for file-based JSON storage
 */
class Storage {
  constructor(filename) {
    this.filepath = path.join(DATA_DIR, filename);
  }

  async read() {
    try {
      const data = await fs.readFile(this.filepath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async write(data) {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(this.filepath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async update(updateFn) {
    const data = await this.read() || {};
    const updated = await updateFn(data);
    await this.write(updated);
    return updated;
  }

  async append(array, item) {
    return this.update(data => {
      if (!data[array]) data[array] = [];
      data[array].push(item);
      return data;
    });
  }
}

// Initialize default data files
async function initializeStorage() {
  const files = {
    'users.json': { admin: { username: 'admin', passwordHash: '', createdAt: new Date().toISOString() } },
    'settings.json': { 
      headerTitle: 'Webinar Platform',
      logoPath: null,
      createdAt: new Date().toISOString()
    },
    'smtp.json': {
      host: '',
      port: 587,
      username: '',
      password: '',
      secure: false,
      from: ''
    },
    'webinars.json': { webinars: [] },
    'results.json': { results: [] }
  };

  await fs.mkdir(DATA_DIR, { recursive: true });

  for (const [filename, defaultData] of Object.entries(files)) {
    const filepath = path.join(DATA_DIR, filename);
    try {
      await fs.access(filepath);
    } catch {
      await fs.writeFile(filepath, JSON.stringify(defaultData, null, 2), 'utf-8');
    }
  }
}

// Initialize on module load
initializeStorage().catch(console.error);

module.exports = { Storage, initializeStorage };
