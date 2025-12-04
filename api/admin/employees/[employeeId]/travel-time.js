import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
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
}

