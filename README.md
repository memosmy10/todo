# Daylist

Daylist is a small Android-first to-do app built with Expo SDK 58, React Native, TypeScript, Expo Router, and Supabase. It has account creation/sign-in, a home dashboard, and a two-tab Home/Tasks experience with synced tasks.

## Run the app

Requirements: Node.js 22 or later and npm.

1. Create a Supabase project.
2. In the project SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql). It creates the task table, enables row-level security, and restricts each account to its own tasks.
3. Create a local `.env` file with the project URL and **publishable** key from the Supabase project’s Connect dialog:

   ```dotenv
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

   These public app values are not service-role secrets; never put a service-role key in the app or an `EXPO_PUBLIC_` variable.
4. In Supabase Authentication, set your email confirmation behavior and configure the email templates/site URLs for your app.
5. Install dependencies and start Expo:

   ```powershell
   npm install
   npm start
   ```

   Press `a` to open an Android emulator, or scan the Expo Go QR code on a device. If Supabase is not configured, the app shows setup instructions instead of pretending sign-in or task saving works.

## Account deletion

Account creation in a Play Store app requires a working account-deletion path. Deploy the included Edge Function before release:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy delete-account
```

The function validates the caller’s access token, then deletes only that authenticated user. Its service-role key is read from the server environment and is never bundled into the app. The database foreign key deletes that user’s tasks. Test deletion with a test account before release.

## Google Play release

This project is configured to build a signed Android App Bundle with EAS:

1. Choose a permanent, unique Android application ID in `app.json` (`android.package`) before your first store upload. The current `com.abbas.daylist` value is a starter; an application ID cannot be changed after publishing.
2. Review the Daylist launcher icon and set the final store name, screenshots, and listing text.
3. Publish a completed copy of [`PRIVACY_POLICY.md`](./PRIVACY_POLICY.md) at a public HTTPS URL. Replace every bracketed placeholder and accurately disclose the Supabase project’s hosting and data practices.
4. Publish a public account-deletion request URL as well as keeping the in-app delete action. Add the privacy-policy and deletion URLs in Play Console.
5. Review Google Play’s current target-API, testing-track, developer-verification, Data safety, content-rating, and store-listing requirements. Disclose name, email, and user-created tasks and the Supabase service provider as applicable.
6. Run the checks below, sign in with a real test account, verify task isolation across accounts, and test account deletion.
7. Sign in to Expo (`npx eas-cli@latest login`), initialize EAS for your account (`npx eas-cli@latest build:configure`), add the two `EXPO_PUBLIC_SUPABASE_*` values to the EAS `production` environment, then run:

   ```powershell
   npx eas-cli@latest build --platform android --profile production
   npx eas-cli@latest submit --platform android --profile production
   ```

   The first Play upload and submission require your Google Play developer account, app listing, and signing setup. Review the generated bundle and Play Console checks before rollout.

## Checks

```powershell
npm run typecheck
npx expo-doctor
```

The Supabase SQL and Edge Function must be deployed to your own project; they cannot be exercised by a local TypeScript check alone.
