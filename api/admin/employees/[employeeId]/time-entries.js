import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
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
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const { employeeId } = req.query;

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
}

