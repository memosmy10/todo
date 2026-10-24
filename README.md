# Daylist

Daylist is an Android-first to-do app built with Expo SDK 58, React Native, TypeScript, Expo Router, and Supabase. It includes account creation/sign-in, a home dashboard, task management, account deletion, and public privacy/help pages.

## Run the app locally

Requirements: Node.js 22 or later and npm.

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](./supabase/schema.sql) in its SQL Editor. This creates the task table and row-level security policies.
3. Create a local `.env` file with your Supabase project URL and publishable key:

   ```powershell
   @'
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
   '@ | Set-Content .env
   ```

   Replace the example values using the Supabase project's Connect page. These values are included in the app bundle; never put a Supabase service-role key in `.env` or an `EXPO_PUBLIC_` variable.
4. Configure Supabase Authentication email verification and email settings.
5. Run `npm install`, then `npm start`. Press `a` for an Android emulator or scan the QR code with Expo Go. With missing Supabase settings, the app shows setup instructions instead of pretending authentication works.

## Deploy account deletion

Google Play requires both in-app account deletion and a public webpage from which people can request deletion without reinstalling the app. Daylist includes the in-app deletion action, an authenticated Supabase Edge Function, and a public email-request page.

1. Choose a monitored support email and replace the bracketed placeholders on the account deletion page and privacy policy.
2. Install and authenticate the Supabase CLI, link the correct project, and deploy the function:

   ```powershell
   npx supabase login
   npx supabase link --project-ref YOUR_SUPABASE_PROJECT_REF
   npx supabase functions deploy delete-account
   ```

3. Test deletion with a test account. The Edge Function verifies the caller's access token and uses the server-only Supabase service-role key; that key must never be exposed to the app.
4. Make the public deletion request email path work. Do not submit the Play Console deletion URL until the email address is real, monitored, and requests are handled as the page promises.

## Publish the landing page and policies on Vercel

The static public website lives in [`docs/`](./docs/). The root [`vercel.json`](./vercel.json) tells Vercel to serve this folder as a static site instead of trying to build the Expo app as a website. Keep the Vercel project **Root Directory** set to the repository root (`.`), not `docs`, so the root configuration is picked up.

1. Ensure `vercel.json` and the `docs/` website folder are committed and pushed to GitHub.
2. In Vercel, confirm **Settings → Build and Deployment → Root Directory** is the repository root (`.`). If you previously set it to `docs`, change it back to the repository root and save.
3. Open **Deployments** and redeploy the latest `main` commit, or push the changes to `main` to trigger deployment.
4. Open **Settings → Domains** and copy the production domain Vercel assigned to the project.
5. Test these HTTPS URLs in a signed-out browser:
   - Landing page: `https://YOUR_VERCEL_DOMAIN/`
   - Privacy policy: `https://YOUR_VERCEL_DOMAIN/privacy-policy.html`
   - Account deletion: `https://YOUR_VERCEL_DOMAIN/account-deletion.html`
   - Terms of service (optional): `https://YOUR_VERCEL_DOMAIN/terms-of-service.html`

Before publishing, replace every `[REPLACE ...]` or bracketed placeholder, confirm the Supabase region and data disclosures, test the deletion email, and make the policy effective date accurate. Google Play requires a privacy policy and a usable external account-deletion request resource. You must complete Data safety and deletion declarations separately in Play Console. The terms page is optional and is not legal advice.

Add `EXPO_PUBLIC_WEBSITE_URL` with the full Vercel production URL (for example, `https://your-project.vercel.app/`) to the **Production environment variables of the EAS app project**. This is a public URL, not a secret. Rebuild the app after adding it so in-app Privacy and Deletion links open the Vercel site. Add the same URL to your local `.env` only if you want the links to work during local testing. Do not overwrite or publish your existing `.env`.

The app already links to the privacy policy and terms on the sign-in screen, and to privacy/deletion help in the signed-in Home screen.

## Link the app to your existing EAS project

Your existing EAS project is configured in `app.json` as `todo`, with ID `3178ee15-8344-4ea3-a660-181461d5f528`. In a VS Code terminal, navigate to this existing app folder and verify the connection:

```powershell
Set-Location C:\Users\abbas\Downloads\todo
npx eas-cli@latest login
npx eas-cli@latest project:info
```

Complete the Expo sign-in prompt in the terminal/browser and check that `project:info` shows your existing `memosmy` team project. Your VS Code terminal has its own Expo CLI login even if you are already signed in to the Expo website. The dashboard project already exists; do not initialize a second EAS project.

**Do not run** the dashboard's `npx create-expo-app todo` command: this app already exists in `C:\Users\abbas\Downloads\todo`. Creating another folder would make a second, empty project rather than connect this app to your EAS project.

## Prepare a Google Play release

### 1. Set the permanent Android package ID

The selected permanent Android application ID in [`app.json`](./app.json) is `com.memosmy.daylist`. Confirm this is the ID you intend to use on Google Play before creating the Play Console app or the first Android signing key. You cannot change the application ID after publishing.

### 2. Configure the production Supabase variables in EAS

Create or configure a Supabase project and deploy `supabase/schema.sql` and the account-deletion Edge Function first. In your EAS `todo` project dashboard, open **Environment variables**, add both variables to the **production** environment, and use the values from your Supabase Connect page:

- `EXPO_PUBLIC_SUPABASE_URL` — your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — your Supabase publishable key (not a secret service-role key)
- `EXPO_PUBLIC_WEBSITE_URL` — your Vercel production domain (for example, `https://your-project.vercel.app/`)

All three must be available in the **production** environment because the production build profile in [`eas.json`](./eas.json) explicitly selects that environment. These public app configuration values will be embedded in the app; never upload a service-role key.

### 3. Finish the Play Console app and disclosures

In your Google Play Console account, create the app using the same permanent application ID you selected above. Add the actual HTTPS privacy policy and account-deletion URLs to the app listing and **App content → Data safety**. Complete the Data safety and data-deletion questions from what the app, Supabase, and any added SDKs really collect/share; do not guess or claim that no data is collected. Complete the store listing, age/content declarations, target-audience and other required console steps. Review any testing requirements Play Console shows for your developer account.

Use the legal publisher name and a monitored contact email consistently on the public website and in Play Console. The privacy and deletion pages are editable templates, not a guarantee of Play approval; review them against your real processing practices and local legal requirements.

### 4. Build the signed Android App Bundle

After verifying the EAS link, confirming your final package ID, setting the three EAS production variables, and completing Expo's project setup, run:

```powershell
npx eas-cli@latest build --platform android --profile production
```

EAS builds in the cloud. On the first Android build, follow the prompt to let EAS generate/manage Android signing credentials and keep using the same key for future updates. The production profile creates a Play-compatible **`.aab`** App Bundle. The account used for EAS and the account used for Google Play are separate.

### 5. Upload and publish

Review and install/test the bundle, then use the EAS build's **Submit to Google Play** flow or set up a Google Play service account in EAS and use:

```powershell
npx eas-cli@latest submit --platform android --profile production
```

Google Play submission also requires a Play developer account, a Play Console app entry, and Play submission credentials. You can create the first internal-test release from EAS Submit or upload the AAB in Play Console. Complete any Play testing, declarations, and store listing tasks before promoting a release to production. Building or uploading a bundle does not itself publish the app.

## Checks

```powershell
npm run typecheck
npx expo lint
npx expo-doctor
```

The Supabase database and Edge Function must be deployed to your own project; local TypeScript and bundle checks do not test those services or guarantee Play approval.
