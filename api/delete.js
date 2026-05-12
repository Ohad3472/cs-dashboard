const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SALT = process.env.SALT || 'cs-dashboard-salt-2026';

function verifyToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return null;
    const [username, ts, sig] = parts;
    const expected = crypto.createHmac('sha256', SALT).update(`${username}:${ts}`).digest('hex');
    if (sig !== expected) return null;
    if (Date.now() - parseInt(ts) > 24 * 60 * 60 * 1000) return null;
    return username;
  } catch(e) { return null; }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!verifyToken(token)) return res.status(401).json({ error: 'Unauthorized' });

  const { date } = req.body || {};
  if (!date) return res.status(400).json({ error: 'Missing date' });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { error } = await supabase.from('snapshots').delete().eq('report_date', date);
  if (error) return res.status(500).json({ error: 'Failed to delete' });
  return res.status(200).json({ success: true });
};
