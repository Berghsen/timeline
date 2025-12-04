# Time Tracker

A complete time-tracking platform with role-based access control for employees and administrators, built for Vercel deployment.

## Features

- **Authentication**: Secure login using Supabase Auth (no sign-up page - accounts must be created manually)
- **Employee Dashboard**: 
  - Timeline page to track work hours
  - Add, edit, and delete time entries
  - View entries by date
  - Weekly calendar overview with week numbers
  - Monthly statistics
- **Admin Dashboard**:
  - View all employees
  - View time entries for any employee
  - Weekly and monthly calendar views
  - Set travel time deductions per employee
  - Detailed entry views with comments
- **Row-Level Security**: Implemented via Supabase RLS policies
- **Role-Based Access**: Employees can only see their own data, admins can see all data

## Tech Stack

- **Frontend**: React 18
- **Backend**: Vercel Serverless Functions
- **Database & Auth**: Supabase (PostgreSQL with RLS)

## Setup Instructions

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the SQL script from `supabase/schema.sql`
3. Run `supabase/add_travel_time_column.sql` to add the travel time column
4. Run `supabase/fix_rls_recursion.sql` to fix RLS policies
5. In Supabase Dashboard → Authentication → Settings:
   - Disable "Confirm email" (since you're creating users manually)

### 2. Create Users in Supabase

1. Go to Authentication → Users in Supabase Dashboard
2. Click "Add user" → "Create new user"
3. Enter email and password
4. In the user metadata, add:
   ```json
   {
     "role": "employee",
     "full_name": "John Doe"
   }
   ```
   Or for admin:
   ```json
   {
     "role": "admin",
     "full_name": "Admin User"
   }
   ```

### 3. Environment Variables

Create a `.env` file in the root directory:

```env
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 4. Local Development

```bash
npm install
npm start
```

The app will run on `http://localhost:3000`

### 5. Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel project settings:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy!

The `vercel.json` is already configured for automatic deployment.

## Project Structure

```
time-tracker/
├── api/                    # Vercel serverless functions
│   ├── admin/
│   ├── user/
│   └── health.js
├── public/                 # Static assets
├── src/                    # React source code
│   ├── components/         # Reusable components
│   ├── contexts/           # React contexts (Auth)
│   ├── pages/              # Page components
│   ├── App.js
│   └── index.js
├── supabase/               # SQL migration scripts
├── package.json
└── vercel.json             # Vercel configuration
```

## API Routes

All API routes are serverless functions in the `api/` directory:

- `GET /api/health` - Health check
- `GET /api/user/profile` - Get user profile
- `GET /api/admin/employees` - Get all employees (admin only)
- `GET /api/admin/employees/:employeeId/time-entries` - Get employee time entries (admin only)
- `PUT /api/admin/employees/:employeeId/travel-time` - Update employee travel time (admin only)

## License

ISC
