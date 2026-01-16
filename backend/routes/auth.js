const express = require('express');
const { authenticateUser, generateToken, setAdminPassword } = require('../utils/auth');
const { logAudit } = require('../utils/logger');

const router = express.Router();

/**
 * POST /api/auth/login
 * Admin login
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Benutzername und Passwort erforderlich' });
    }

    const user = await authenticateUser(username, password);

    if (!user) {
      logAudit('LOGIN_FAILED', req.ip, `Fehlgeschlagener Login-Versuch: ${username}`);
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }

    const token = generateToken(user.username);
    logAudit('LOGIN_SUCCESS', user.username, 'Erfolgreicher Login');

    res.json({ token, username: user.username });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Anmeldefehler' });
  }
});

/**
 * POST /api/auth/setup
 * Initial admin password setup (only works if no password is set)
 */
router.post('/setup', async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen lang sein' });
    }

    await setAdminPassword(password);
    logAudit('SETUP', req.ip, 'Admin-Passwort wurde eingerichtet');

    res.json({ message: 'Admin-Passwort erfolgreich eingerichtet' });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ error: 'Setup-Fehler' });
  }
});

module.exports = router;
