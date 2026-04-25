# Google Cloud Setup

You only need this if you want to test Scribe Steel against the **real** Google Drive API. For most contributors, `npm run dev:mock` (which uses an in-browser mock backed by `localStorage`) is enough — see [CONTRIBUTING.md](CONTRIBUTING.md).

The setup creates a Google Cloud OAuth client ID that lets your local dev server talk to Drive on behalf of a Google account.

## Steps

### 1. Create or select a Google Cloud project

Open the [Google Cloud Console](https://console.cloud.google.com/), and either pick an existing project or click **New Project** and create one. Any name works — it only shows up in your own developer console.

### 2. Enable the Google Drive API

In the Cloud Console, navigate to **APIs & Services → Library**, search for **Google Drive API**, and click **Enable**.

### 3. Configure the OAuth consent screen

Navigate to **APIs & Services → OAuth consent screen**:

1. **User type:** External. (Internal is only available to Workspace organizations.)
2. **App information:**
   - App name: anything (e.g. "Scribe Steel — Local Dev")
   - User support email: your email
   - Developer contact email: your email
3. **Scopes:** click **Add or Remove Scopes** and add:
   - `https://www.googleapis.com/auth/drive.file`

   This is the narrow Drive scope the app uses — it only grants access to files the app itself creates or that the user explicitly opens with it.
4. **Test users:** while the app is in *Testing* mode, add the Google accounts you'll be signing in as. Up to 100 testers are allowed.

You can leave the publishing status as **Testing** indefinitely for personal use; only submit for verification if you want to share the app with users outside your test list.

### 4. Create OAuth client credentials

Navigate to **APIs & Services → Credentials**, click **Create Credentials → OAuth client ID**:

1. **Application type:** Web application
2. **Name:** anything
3. **Authorized JavaScript origins:** add the URL(s) you'll run the dev server on:
   - `http://localhost:5173` (the default Vite port)
   - Add any other origins you need (e.g. `http://localhost:5174` for `dev:mock`, or a deployed preview URL)
4. **Authorized redirect URIs:** leave empty. Scribe Steel uses the [Google Identity Services](https://developers.google.com/identity/oauth2/web) implicit token flow, which doesn't use a redirect URI.

Click **Create**. Copy the resulting **Client ID** (the long string ending in `.apps.googleusercontent.com`).

### 5. Configure the env file

In your local checkout:

```bash
cp .env.example .env.local
```

Edit `.env.local` and paste the client ID into `VITE_GOOGLE_CLIENT_ID`. Leave `VITE_USE_MOCK_DRIVE` unset.

### 6. Run the dev server

```bash
npm run dev
```

Open http://localhost:5173 and use the **Sign in with Google** button. The OAuth consent screen will warn that the app is unverified — that's expected for a Test-mode app. Click through and you should be signed in.

## Troubleshooting

- **"Access blocked: ... has not completed the Google verification process"**: your Google account isn't on the test users list. Add it under **APIs & Services → OAuth consent screen → Audience → Test users**.
- **Sign-in pop-up closes immediately with no token**: check the browser's developer console. The most common cause is a mismatch between your dev server's origin and the **Authorized JavaScript origins** list — they must match exactly, including `http` vs `https` and port number.
- **`drive.file` scope errors**: confirm the Google Drive API is enabled in your project (step 2). Newly-enabled APIs can take a minute to propagate.
