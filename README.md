# FinControl

FinControl is a ready MVP for personal finance tracking.

## Features
- email/password auth with Supabase;
- cloud PostgreSQL database with Row Level Security;
- income and expense tracking;
- planned expenses;
- monthly report;
- category report;
- JSON backup export and import;
- responsive mobile UI;
- PWA support for iPhone;
- Android APK preparation through Capacitor;
- GitHub Actions workflow for debug APK.

## Local start
```bash
npm install
npm run dev
```

## Supabase setup
1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase/schema.sql`.
4. Add environment variables in Vercel or local env file:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

Without these variables the app works in demo mode and stores data only in the browser.

## Vercel deploy
- Framework Preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

## Android APK
```bash
npm install
npm run android:init
npm run android:open
```

Then use Android Studio: Build -> Generate Signed Bundle / APK -> APK.
