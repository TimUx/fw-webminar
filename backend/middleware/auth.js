const { verifyToken } = require('../utils/auth');
const { logAudit } = require('../utils/logger');

/**
 * Authentication middleware
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logAudit('AUTH_FAILED', req.ip, 'Fehlende oder ungültige Authentifizierung');
    return res.status(401).json({ error: 'Authentifizierung erforderlich' });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    logAudit('AUTH_FAILED', req.ip, 'Ungültiges Token');
    return res.status(401).json({ error: 'Ungültiges oder abgelaufenes Token' });
  }

  req.user = decoded;
  next();
}

module.exports = { authMiddleware };
