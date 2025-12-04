# Vercel Deployment Guide

This project is now configured as a single-folder structure for easy Vercel deployment.

## Quick Deploy

1. **Push to GitHub** (if not already done)
2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
3. **Add Environment Variables** in Vercel project settings:
   - `REACT_APP_SUPABASE_URL` - Your Supabase project URL
   - `REACT_APP_SUPABASE_ANON_KEY` - Your Supabase anon/public key
   - `SUPABASE_URL` - Your Supabase project URL (same as above)
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for API routes)
4. **Deploy!** - Vercel will automatically detect the React app and deploy

## Project Structure

The project is now organized as:
- **Root**: All React app files
- **`api/`**: Vercel serverless functions (backend API)
- **`src/`**: React source code
- **`public/`**: Static assets

## How It Works

- **Frontend**: React app builds to `build/` directory
- **Backend**: API routes in `api/` become serverless functions
- **Routing**: All routes go through React Router, API routes are handled by Vercel

## Environment Variables

Make sure to set these in Vercel:
- `REACT_APP_SUPABASE_URL` - Used by frontend
- `REACT_APP_SUPABASE_ANON_KEY` - Used by frontend
- `SUPABASE_URL` - Used by API routes
- `SUPABASE_SERVICE_ROLE_KEY` - Used by API routes (admin operations)

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Verify Node.js version (Vercel uses Node 18 by default)
- Check build logs in Vercel dashboard

### API Routes Return 404
- Ensure API files are in `api/` directory
- Check that file names match route paths
- Verify environment variables are set

### Frontend Can't Connect to API
- API routes use relative paths (`/api/...`)
- No need to set `REACT_APP_API_URL` - it's handled automatically
- Check browser console for CORS errors
