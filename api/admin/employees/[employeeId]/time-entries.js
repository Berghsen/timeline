import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client (will be null if env vars are missing)
let supabase = null;

if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase) {
    console.error('Missing Supabase environment variables');
    return res.status(500).json({ error: 'Server configuration error: Missing Supabase credentials' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error checking admin profile:', profileError);
      return res.status(500).json({ error: 'Failed to verify admin status' });
    }

    if (!profile || profile.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    // Get employeeId from query parameters (Vercel dynamic routes)
    const { employeeId } = req.query;
    
    console.log('Request query:', req.query);
    console.log('Employee ID:', employeeId);

    if (!employeeId) {
      console.error('No employeeId provided in request');
      return res.status(400).json({ error: 'Employee ID is required' });
    }

    // Get time entries for the employee
    const { data: entries, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', employeeId)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching time entries:', error);
      return res.status(500).json({ error: 'Failed to fetch time entries', details: error.message });
    }

    res.json(entries || []);
  } catch (error) {
    console.error('Error fetching employee time entries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

