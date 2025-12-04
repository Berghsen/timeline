# Time Tracker

A complete time-tracking platform with role-based access control for employees and administrators.

## Features

- **Authentication**: Secure login using Supabase Auth (no sign-up page - accounts must be created manually)
- **Employee Dashboard**: 
  - Timeline page to track work hours
  - Add, edit, and delete time entries
  - View entries by date
- **Admin Dashboard**:
  - View all employees
  - View time entries for any employee
- **Row-Level Security**: Implemented via Supabase RLS policies
- **Role-Based Access**: Employees can only see their own data, admins can see all data

## Tech Stack

- **Frontend**: React 18
- **Backend**: Node.js with Express
- **Database & Auth**: Supabase (PostgreSQL with RLS)
- **Routing**: React Router

## Setup Instructions

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the SQL script from `supabase/schema.sql`
3. Go to Authentication > Users and create user accounts manually:
   - For employees: Create user and set `role` metadata to `"employee"` in the user's metadata
   - For admins: Create user and set `role` metadata to `"admin"` in the user's metadata
4. Get your project URL and anon key from Settings > API
5. Get your service role key from Settings > API (keep this secret!)

### 2. Environment Variables

#### Backend (`server/.env`)
```env
PORT=3001
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

#### Frontend (`client/.env`)
```env
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_API_URL=http://localhost:3001
```

### 3. Install Dependencies

```bash
npm run install-all
```

### 4. Run the Application

```bash
npm run dev
```

This will start both the backend server (port 3001) and the React app (port 3000).

## Project Structure

```
time-tracker/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── contexts/      # React contexts (Auth)
│   │   ├── pages/         # Page components
│   │   └── App.js         # Main app component
│   └── package.json
├── server/                # Node.js backend
│   ├── index.js          # Express server
│   └── package.json
├── supabase/
│   └── schema.sql        # Database schema and RLS policies
└── package.json          # Root package.json
```

## Creating Users in Supabase

Since there's no sign-up page, you need to create users manually:

### Method 1: Using Supabase Dashboard (Recommended)

1. Go to Supabase Dashboard > Authentication > Users
2. Click "Add User" or "Invite User"
3. Set the email and password
4. **Important**: In the "User Metadata" field, add:
   - For employees: `{"role": "employee", "full_name": "Employee Name"}`
   - For admins: `{"role": "admin", "full_name": "Admin Name"}`
5. The trigger should automatically create a profile in `user_profiles` table

### Method 2: For Existing Users Without Profiles

If you created users before setting up the trigger, or if profiles weren't created automatically:

1. Go to Supabase Dashboard > SQL Editor
2. Run the script from `supabase/create_profiles_for_existing_users.sql`
3. This will create profiles for all users that don't have one yet

### Method 3: Manual SQL Insert

If you need more control, you can manually insert profiles:

```sql
-- First, get the user ID from auth.users
SELECT id, email FROM auth.users WHERE email = 'user@example.com';

-- Then insert the profile
INSERT INTO public.user_profiles (id, email, full_name, role)
VALUES (
  'user-uuid-here',
  'user@example.com',
  'Full Name',
  'employee'  -- or 'admin'
);
```

### Disable Email Confirmation

By default, Supabase requires email confirmation. To disable it:

1. Go to Supabase Dashboard > Authentication > Settings
2. Under "Email Auth", find "Confirm email"
3. **Turn OFF** "Enable email confirmations"
4. Save the changes

**Note:** For existing users that were created before disabling confirmation, you can confirm them manually using SQL:

```sql
-- Confirm all existing users
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;
```

### Troubleshooting Login Issues

If you can't sign in:
1. Check that the user exists in `auth.users` table
2. Check that a profile exists in `user_profiles` table
3. If profile is missing, use Method 2 or 3 above
4. The app will now automatically try to create a profile on login if it's missing (defaults to 'employee' role)
5. If you see "Email not confirmed" error, disable email confirmation in Supabase settings (see above)

## Database Schema

- **user_profiles**: Stores user information and roles
- **time_entries**: Stores time tracking entries with date, start/end times, and comments

## Security

- Row-Level Security (RLS) is enabled on all tables
- Employees can only access their own time entries
- Admins can access all data
- Service role key is only used on the backend
- Frontend uses the anon key with RLS policies

## License

ISC

