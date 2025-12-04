# Deployment Guide for Vercel

## Frontend Deployment (Vercel)

### 1. Environment Variables

In your Vercel project settings, add these environment variables:

```
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_API_URL=your_backend_api_url
```

**Important:** 
- Replace `your_backend_api_url` with your deployed backend URL (see Backend Deployment below)
- If deploying backend separately, use that URL
- If using Vercel serverless functions for the backend, use your Vercel domain

### 2. Vercel Project Settings

1. Go to your Vercel project settings
2. Under "Build & Development Settings":
   - **Framework Preset:** Create React App
   - **Root Directory:** Leave empty (or set to `client` if needed)
   - **Build Command:** `cd client && npm run build`
   - **Output Directory:** `client/build`
   - **Install Command:** `cd client && npm install`

### 3. Deploy

Push to your Git repository and Vercel will automatically deploy.

## Backend Deployment Options

### Option 1: Deploy Backend Separately (Recommended)

Deploy your Node.js backend to:
- **Railway** (railway.app)
- **Render** (render.com)
- **Heroku** (heroku.com)
- **DigitalOcean App Platform**
- Or any Node.js hosting service

Then update `REACT_APP_API_URL` in Vercel to point to your backend URL.

### Option 2: Vercel Serverless Functions

Convert your Express routes to Vercel serverless functions. This requires restructuring the backend code.

### Option 3: Keep Backend Local (Development Only)

For development, run the backend locally and use `http://localhost:3001` in your `.env` file.

## Troubleshooting

### 404 Error

If you get a 404 error:
1. Check that `vercel.json` is in the root directory
2. Verify the build output directory is correct
3. Make sure all environment variables are set in Vercel
4. Check Vercel build logs for errors

### API Connection Issues

If the frontend can't connect to the backend:
1. Ensure `REACT_APP_API_URL` is set correctly
2. Check CORS settings on your backend
3. Verify the backend is deployed and accessible
4. Check browser console for CORS errors

### Build Failures

If the build fails:
1. Check that all dependencies are in `client/package.json`
2. Verify Node.js version compatibility
3. Check Vercel build logs for specific errors
4. Ensure `client/build` directory is being created

