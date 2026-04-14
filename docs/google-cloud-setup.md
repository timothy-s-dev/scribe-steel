# Google Cloud Project Setup

This guide walks through setting up the Google Cloud project needed for Google Drive storage.

## 1. Create a GCP Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click **Select a project** > **New Project**
3. Name it (e.g., "Scribe Steel") and create it

## 2. Set Up a Domain with Cloud DNS (optional — needed for production)

You can skip this section and come back later. The app works on localhost without a domain. But if you want to set up production hosting now, do this before creating the OAuth client ID so you can add both origins at once.

### Register or transfer a domain

If you don't have a domain yet, you can register one through [Cloud Domains](https://console.cloud.google.com/net-services/domains) (GCP's registrar) or any other registrar.

### Set up Cloud DNS

1. Go to **Network services** > **Cloud DNS** in the GCP console
2. Click **Create zone**
   - Zone type: **Public**
   - Zone name: e.g., `scribe-steel`
   - DNS name: your domain (e.g., `scribe-steel.com`)
3. Click **Create**
4. GCP will give you 4 NS (nameserver) records. Update your domain registrar's nameservers to point to these.

### Add DNS records

In your Cloud DNS zone, add the records that Firebase Hosting gives you (see step 2b below).

### Verify domain ownership

Google needs to verify you own the domain before OAuth verification:

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add your domain as a property
3. Choose **DNS verification** — it will give you a TXT record to add
4. Add the TXT record in your Cloud DNS zone
5. Complete verification

## 2b. Set Up Firebase Hosting

Firebase Hosting serves the built static files with HTTPS, CDN, and custom domain support. Free tier is generous (10GB transfer/month, 1GB storage).

### Install Firebase CLI

```
npm install -g firebase-tools
```

### Initialize Firebase in the project

```
firebase login
firebase init hosting
```

When prompted:
- **Project**: Select the GCP project you created in step 1
- **Public directory**: `dist`
- **Single-page app**: Yes (rewrite all URLs to `/index.html`)
- **GitHub auto-deploys**: Up to you (can set up later)

This creates `firebase.json` and `.firebaserc` in the project root.

### Deploy

Build the app and deploy:

```
npm run build
firebase deploy --only hosting
```

Firebase will give you a URL like `https://your-project.web.app`. The site is live.

### Connect your custom domain

1. In the [Firebase console](https://console.firebase.google.com), go to **Hosting**
2. Click **Add custom domain**
3. Enter your domain (e.g., `scribe-steel.com`)
4. Firebase will give you DNS records to add:
   - Typically an `A` record (or two) pointing to Firebase's IPs
   - A `TXT` record for verification (if not already verified)
5. Add these records in your **Cloud DNS** zone from step 2
6. Wait for DNS propagation and SSL provisioning (can take up to 24 hours, usually faster)

### Add the production origin to OAuth

Once your domain is live, make sure it's listed as an authorized JavaScript origin in your OAuth client ID (step 5 of this guide).

## 3. Enable the Google Drive API

1. In the project, go to **APIs & Services** > **Library**
2. Search for "Google Drive API"
3. Click **Enable**

## 4. Configure the OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Select **External** user type
3. Fill in:
   - App name: **Scribe Steel**
   - User support email: your email
   - Developer contact: your email
4. Add scope: `https://www.googleapis.com/auth/drive.file`
5. Save — the app will be in **Testing** mode (up to 100 test users)
6. Under **Test users**, add the Google accounts that should be able to sign in

## 5. Create OAuth Client ID

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Application type: **Web application**
4. Name: "Scribe Steel Web"
5. Authorized JavaScript origins — add both:
   - `http://localhost:5173` (local development)
   - `https://yourdomain.com` (production, if set up in step 2)
6. Click **Create** and copy the **Client ID**

Both origins use the same client ID. The GIS library detects which origin the app is running on automatically. Local dev and production work simultaneously — no switching needed.

## 6. Configure the App

1. Copy `.env.example` to `.env.local`:
   ```
   cp .env.example .env.local
   ```
2. Paste your Client ID:
   ```
   VITE_GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
   ```
3. Restart the dev server

## 7. Submit for OAuth Verification (when ready for public)

Once you have a domain, hosting, and a privacy policy page:

1. Go to **APIs & Services** > **OAuth consent screen**
2. Click **Publish App**
3. Fill in:
   - App homepage: `https://yourdomain.com`
   - Privacy policy: `https://yourdomain.com/privacy`
   - Authorized domains: `yourdomain.com`
4. Submit for review

Review typically takes a few days. Since `drive.file` is a non-sensitive scope, the process is straightforward — no security assessment required.

## Notes

- **Testing mode**: Only users added as test users can sign in. Works on both localhost and production origins. Fine for development.
- **Multiple origins**: A single OAuth client ID supports multiple authorized origins. Add localhost for dev and your domain for production — both work at the same time.
- **Scope**: `drive.file` only grants access to files the app creates. It cannot read or modify any other files in the user's Drive. This is the least-permissive Drive scope.
- **Token handling**: Access tokens are kept in memory only (not persisted to storage). The GIS library handles token refresh automatically. Users will need to re-authorize after closing the browser.
