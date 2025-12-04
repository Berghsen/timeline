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

    // Get all employees - using service role key so RLS is bypassed
    let { data: employees, error } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, travel_time_minutes, created_at')
      .eq('role', 'employee')
      .order('created_at', { ascending: false });

    // If travel_time_minutes column doesn't exist, the query will fail
    // Try without it and add default values
    if (error && error.message && error.message.includes('travel_time_minutes')) {
      const { data: employeesBasic, error: basicError } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, created_at')
        .eq('role', 'employee')
        .order('created_at', { ascending: false });
      
      if (!basicError && employeesBasic) {
        employees = employeesBasic.map(emp => ({ ...emp, travel_time_minutes: 0 }));
        error = null;
      }
    }

    if (error) {
      console.error('Error fetching employees:', error);
      return res.status(500).json({ error: 'Failed to fetch employees', details: error.message });
    }

    res.json(employees || []);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

