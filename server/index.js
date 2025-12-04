import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get user profile (for checking role)
app.get('/api/user/profile', async (req, res) => {
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

    // Get user profile with role
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ user, profile });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all employees (admin only)
app.get('/api/admin/employees', async (req, res) => {
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
});

// Update employee travel time (admin only)
app.put('/api/admin/employees/:employeeId/travel-time', async (req, res) => {
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
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const { employeeId } = req.params;
    const { travel_time_minutes } = req.body;

    if (travel_time_minutes === undefined || travel_time_minutes < 0) {
      return res.status(400).json({ error: 'Invalid travel_time_minutes value' });
    }

    // Update travel time
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ travel_time_minutes: parseInt(travel_time_minutes) })
      .eq('id', employeeId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update travel time' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error updating travel time:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get time entries for a specific employee (admin only)
app.get('/api/admin/employees/:employeeId/time-entries', async (req, res) => {
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
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const { employeeId } = req.params;

    // Get time entries for the employee
    const { data: entries, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', employeeId)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch time entries' });
    }

    res.json(entries);
  } catch (error) {
    console.error('Error fetching employee time entries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

