# Netlify Deployment Guide

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Netlify account

## Environment Variables

Make sure to set these environment variables in your Netlify dashboard:

```
OPENAI_API_KEY=your_openai_api_key_here
XAI_API_KEY=your_xai_api_key_here
NODE_ENV=production
```

## Build Settings in Netlify

- **Build command**: `npm run build`
- **Publish directory**: `.next`
- **Node version**: 18

## Deployment Steps

1. **Connect your repository** to Netlify
2. **Set build settings** as specified above
3. **Add environment variables** in the Netlify dashboard
4. **Deploy** your application

## Troubleshooting

### Html Component Error

If you encounter the "Html component imported outside of pages/\_document" error:

1. Ensure you're using the App Router structure (which you are)
2. Check that all components are properly imported
3. Verify the layout.tsx file structure
4. Make sure the @netlify/plugin-nextjs plugin is installed

### Build Failures

1. Check Node.js version compatibility
2. Verify all dependencies are properly installed
3. Check for TypeScript errors
4. Ensure environment variables are set

### API Routes Not Working

1. Verify the @netlify/plugin-nextjs plugin is configured
2. Check that API routes are properly exported
3. Ensure CORS headers are set correctly

## Local Testing

Before deploying, test your build locally:

```bash
npm run build
npm start
```

## Support

If you continue to have issues:

1. Check Netlify build logs for specific error messages
2. Verify your Next.js version compatibility
3. Consider using Vercel as an alternative (which has better Next.js support)
