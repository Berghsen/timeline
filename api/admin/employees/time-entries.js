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

    // Get employeeId from query parameters
    const { employeeId } = req.query;
    
    console.log('Full request query:', JSON.stringify(req.query, null, 2));
    console.log('Extracted Employee ID:', employeeId);

    if (!employeeId) {
      console.error('No employeeId provided in request');
      console.error('Available query keys:', Object.keys(req.query));
      return res.status(400).json({ error: 'Employee ID is required', query: req.query });
    }

    // Get time entries for the employee
    console.log('Querying time_entries table for user_id:', employeeId);
    console.log('Employee ID type:', typeof employeeId);
    
    // First, let's check if there are ANY time entries in the table
    const { data: allEntries, error: allError } = await supabase
      .from('time_entries')
      .select('user_id, id, date')
      .limit(5);
    
    console.log('Sample time entries (first 5):', allEntries);
    console.log('All entries error:', allError);
    
    // Now query for this specific employee
    const { data: entries, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', employeeId)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false });

    console.log('Supabase query result - entries found:', entries?.length || 0);
    console.log('Supabase query result - entries:', entries);
    console.log('Supabase query result - error:', error);

    if (error) {
      console.error('Error fetching time entries:', error);
      return res.status(500).json({ error: 'Failed to fetch time entries', details: error.message });
    }

    console.log('Returning entries:', entries?.length || 0, 'entries');
    res.json(entries || []);
  } catch (error) {
    console.error('Error fetching employee time entries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

