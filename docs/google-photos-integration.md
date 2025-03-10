# Google Photos Integration

This document explains how the Google Photos integration works in the Habits application.

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

To set up the Google Photos integration, follow these steps:

1. Follow the instructions in `docs/google-photos-setup.md` to create a Google Cloud project and enable the Google Photos API
2. Configure your environment variables with the required Google credentials
3. Use the `/api/photos/auth` endpoint to get the authorization URL
4. Complete the OAuth flow and add the tokens to your environment variables
5. Configure the `GOOGLE_PHOTOS_ALBUM_ID` with the desired album

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
