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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const username = verifyToken(token);
  if (!username) return res.status(401).json({ error: 'Unauthorized — please log in' });

  const { snapshot } = req.body || {};
  if (!snapshot || !snapshot.date) return res.status(400).json({ error: 'Invalid snapshot data' });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { error } = await supabase.from('snapshots').upsert({
    report_date: snapshot.date,
    filename: snapshot.filename,
    uploaded_by: username,
    uploaded_at: new Date().toISOString(),
    data: snapshot
  }, { onConflict: 'report_date' });

  if (error) return res.status(500).json({ error: 'Failed to save: ' + error.message });
  return res.status(200).json({ success: true, date: snapshot.date, uploaded_by: username });
};
