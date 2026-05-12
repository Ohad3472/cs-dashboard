const crypto = require('crypto');
const SALT = process.env.SALT || 'cs-dashboard-salt-2026';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { token } = req.body || {};
  if (!token) return res.status(200).json({ valid: false });

  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return res.status(200).json({ valid: false });
    const [username, ts, sig] = parts;
    const expected = crypto.createHmac('sha256', SALT).update(`${username}:${ts}`).digest('hex');
    if (sig !== expected) return res.status(200).json({ valid: false });
    if (Date.now() - parseInt(ts) > 24 * 60 * 60 * 1000) return res.status(200).json({ valid: false, expired: true });
    return res.status(200).json({ valid: true, username });
  } catch(e) {
    return res.status(200).json({ valid: false });
  }
};
