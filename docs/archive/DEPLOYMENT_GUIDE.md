# ConnectSphere - Deployment Guide

## 1. Prerequisites
- A Supabase Project (Database, Auth, Storage configured).
- Vercel or Netlify account for Frontend hosting.
- Node.js >= 18.

## 2. Environment Configuration
Create a `.env` file in the frontend repository (never commit this to git):
```
SUPABASE_URL=your-production-url
SUPABASE_ANON_KEY=your-production-anon-key
```

## 3. Database Deployment
Deploy all migrations to your production Supabase instance using the Supabase CLI:
```bash
supabase link --project-ref your-project-ref
supabase db push
```

## 4. Edge Functions
Deploy the AI and Security Edge Functions:
```bash
supabase functions deploy --no-verify-jwt
```

## 5. Frontend Deployment
Run the standard build step and deploy the `frontend` folder as a static site.
```bash
npm install -g vercel
vercel --prod
```
