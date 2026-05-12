const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SALT = process.env.SALT || 'cs-dashboard-salt-2026';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

  const hashed = crypto.createHash('sha256').update(password + SALT).digest('hex');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data, error } = await supabase
    .from('admins')
    .select('id, username')
    .eq('username', username.toLowerCase().trim())
    .eq('password_hash', hashed)
    .single();

  if (error || !data) return res.status(401).json({ error: 'Invalid username or password' });

  const ts = Date.now();
  const payload = `${data.username}:${ts}`;
  const sig = crypto.createHmac('sha256', SALT).update(payload).digest('hex');
  const token = Buffer.from(`${payload}:${sig}`).toString('base64');

  return res.status(200).json({ token, username: data.username });
};
