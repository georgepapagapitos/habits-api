# Google Photos Setup Guide

This guide explains how to set up the Google Photos integration for the Habits application.

## Prerequisites

1. Google Cloud Platform account
2. Google Photos with at least one album containing photos

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Give it a name like "Habits App"

## Step 2: Enable the Google Photos Library API

1. In your Google Cloud Project, go to "APIs & Services" > "Library"
2. Search for "Google Photos Library API"
3. Click on it and click "Enable"

## Step 3: Create OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Configure the OAuth consent screen if prompted
   - Choose "External" user type
   - Fill in the required fields (app name, user support email, developer contact)
   - Add the scope: `.../auth/photoslibrary.readonly`
   - Add your email as a test user
4. Create OAuth client ID
   - Application type: Web application
   - Name: "Habits App Web Client"
   - Authorized JavaScript origins: Add your app's URL (e.g., `http://localhost:5050`)
   - Authorized redirect URIs: Add your callback URL (e.g., `http://localhost:5050/api/photos/oauth2callback`)
5. Click "Create"
6. Note your Client ID and Client Secret

## Step 4: Configure Environment Variables

Add the following environment variables to your project:

```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5050/api/photos/oauth2callback
```

## Step 5: Authorize the Application

1. Start your application
2. Visit `/api/photos/auth` endpoint to get the authorization URL
3. Open the URL in your browser and complete the OAuth flow
4. After authorization, you'll be redirected back to your application
5. The application will log the access token, refresh token, and expiry date

## Step 6: Save Tokens and Album ID

1. Add the tokens to your environment variables:

```
GOOGLE_ACCESS_TOKEN=your_access_token
GOOGLE_REFRESH_TOKEN=your_refresh_token
GOOGLE_TOKEN_EXPIRY=token_expiry_timestamp
```

2. Choose a Google Photos album to use for the app
3. Use the Google Photos API to find your album ID
4. Add it to your environment variables:

```
GOOGLE_PHOTOS_ALBUM_ID=your_album_id
```

## Testing the Integration

Once set up, you can test the integration by visiting:

- `/api/photos/random` - Should return a random photo from your album

## Troubleshooting

- If you get "No photos found in the album", verify your album ID is correct
- If you get "Google credentials not available", check your environment variables
- If tokens expire, you'll need to reauthorize by repeating steps 5-6
