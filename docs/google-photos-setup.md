# Google Photos Integration Setup Guide

This document provides detailed instructions for setting up and troubleshooting Google Photos integration.

## Critical Configuration Requirements

For the Google Photos integration to work properly, you **must** ensure the following configurations are set correctly:

### 1. Google Cloud Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or select an existing one)
3. Navigate to **APIs & Services** > **OAuth consent screen**

   - Set up the consent screen with an appropriate app name
   - Add `https://www.googleapis.com/auth/photoslibrary.readonly` to the scopes
   - Add test users if in testing mode

4. Navigate to **APIs & Services** > **Credentials**
   - Create an OAuth 2.0 Client ID (type: Web application)
   - Add **BOTH** of these Authorized redirect URIs:
     - Backend API callback: `https://[your-api-domain]/api/photos/auth-callback`
     - Frontend callback: `https://[your-frontend-domain]/photos/callback`

### 2. Backend Configuration (.env file)

```env
# Frontend URL (no trailing slash)
FRONTEND_URL=https://your-frontend-domain

# Google Photos API Credentials
GOOGLE_CLIENT_ID=your_client_id_from_google
GOOGLE_CLIENT_SECRET=your_client_secret_from_google

# Must match EXACTLY what's in Google Cloud Console
GOOGLE_REDIRECT_URI=https://your-api-domain/api/photos/auth-callback
```

### 3. Frontend Configuration (.env file)

```env
VITE_API_URL=/api
VITE_BACKEND_URL=https://your-api-domain
```

## Common Issues and Solutions

### Missing Refresh Token

If users aren't getting refresh tokens:

1. Ensure both `access_type=offline` AND `prompt=consent` are included in the auth URL
2. The user may have already granted access - they need to revoke access in their Google account:
   - Go to [Google Account](https://myaccount.google.com)
   - Security > Third-party apps with account access
   - Revoke access for your app
3. Try authentication again

### Authentication Flow Failures

If authentication fails:

1. Check the redirect URIs in Google Cloud Console exactly match your environment
2. Ensure both frontend and backend use the same protocol (both HTTP or both HTTPS)
3. Use the `/api/photos/oauth-debug` endpoint to verify your configuration
4. Check server logs for detailed error messages

## Testing the Integration

1. Login to the application
2. Go to the Rewards section
3. Click "Connect to Google Photos"
4. You should be redirected to Google's auth screen
5. After granting permission, you should be redirected back to the app
6. You should be able to select an album and see photos

## Debugging Tools

Use the `/api/photos/oauth-debug` endpoint (you must be logged in) to check your OAuth configuration.

## Environment Setup

### Development

```env
FRONTEND_URL=http://localhost:3000
GOOGLE_REDIRECT_URI=http://localhost:5050/api/photos/auth-callback
```

### Production

```env
FRONTEND_URL=https://habits.rubygal.com
GOOGLE_REDIRECT_URI=https://habits.rubygal.com/api/photos/auth-callback
```

## Common Errors

### "No refresh token available"

This means the user authenticated but Google didn't provide a refresh token. Solutions:

1. The user needs to revoke access in their Google account and try again
2. Ensure `prompt=consent` is included in the auth URL
3. Check if the user's Google Workspace has restrictions on OAuth

### "redirect_uri_mismatch"

The redirect URI in your request doesn't match what's configured in Google Cloud Console. Double-check:

1. The exact URL (https vs http, www vs non-www, trailing slashes, etc.)
2. That you have added BOTH redirect URIs to Google Cloud Console
3. Your environment variables match your actual deployment

### "User is not connected to Google Photos"

The user needs to authenticate with Google Photos first. Make sure the frontend "Connect to Google Photos" button is working correctly.

## How the OAuth Flow Works

1. User clicks "Connect to Google Photos" on frontend
2. Frontend requests auth URL from backend via `/api/photos/auth-url`
3. Backend generates URL with Google API and returns it
4. Frontend redirects user to Google auth page
5. User grants permission on Google's site
6. Google redirects back to the configured backend URL (`GOOGLE_REDIRECT_URI`)
7. Backend processes the auth code and redirects to frontend callback URL
8. Frontend processes the code and calls backend to exchange it for tokens
9. Backend stores the tokens and user can now access Google Photos

Ensuring each step in this chain works correctly is critical for the integration to function properly.
