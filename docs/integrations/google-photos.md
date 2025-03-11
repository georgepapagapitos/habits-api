# Google Photos Integration

This guide explains how the Google Photos integration works in the Habits application and how to set it up.

## Overview

The Habits application allows users to receive a random photo from a Google Photos album as a reward when they complete a habit. The integration is designed to be simple, using a single set of Google credentials for the entire application.

## Implementation Details

### Core Components

1. **Google Photos Service (`src/services/google-photos.service.ts`)**

   - Handles interactions with the Google Photos API
   - Authenticates using application-wide credentials
   - Retrieves random photos from a configured album

2. **Photo Controller (`src/controllers/photo.controller.ts`)**

   - Provides endpoints for getting random photos
   - Includes admin routes for initial OAuth setup

3. **Habit Controller Integration (`src/controllers/habit.controller.ts`)**
   - Returns a random photo when a habit is completed
   - Only returns photos for habits with `showReward` set to `true`

### API Endpoints

- `GET /api/photos/random` - Get a random photo from the configured album
- `GET /api/photos/auth` - Generate the OAuth URL for initial setup (admin only)
- `GET /api/photos/oauth2callback` - Handle OAuth callback from Google (admin only)

## Setup Process

### Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Give it a name like "Habits App"

### Step 2: Enable the Google Photos Library API

1. In your Google Cloud Project, go to "APIs & Services" > "Library"
2. Search for "Google Photos Library API"
3. Click on it and click "Enable"

### Step 3: Create OAuth Credentials

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

### Step 4: Configure Environment Variables

Add the following environment variables to your project:

```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5050/api/photos/oauth2callback
```

### Step 5: Authorize the Application

1. Start your application
2. Visit `/api/photos/auth` endpoint to get the authorization URL
3. Open the URL in your browser and complete the OAuth flow
4. After authorization, you'll be redirected back to your application
5. The application will log the access token, refresh token, and expiry date

### Step 6: Save Tokens and Album ID

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

## Habit Reward Setup

To enable rewards for habits:

1. When creating or updating a habit, set the `showReward` field to `true`
2. When a user completes a habit with `showReward` set to `true`, the API will return a random photo in the response

## Response Format

A successful photo response will include:

```json
{
  "id": "photo-id",
  "url": "https://lh3.googleusercontent.com/...",
  "width": 1200,
  "height": 800
}
```

## Security Considerations

- The application uses a single set of credentials for all users
- Tokens are stored as environment variables, not in the database
- Only read-only access to photos is requested through the API
- Photo URLs are modified to include the download parameter for direct display

## Troubleshooting

- If you get "No photos found in the album", verify your album ID is correct
- If you get "Google credentials not available", check your environment variables
- If tokens expire, you'll need to reauthorize by repeating steps 5-6
