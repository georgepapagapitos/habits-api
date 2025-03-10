# Google Photos Integration: Administrator Guide

This document provides information for administrators on how to troubleshoot and manage the Google Photos integration in the Habits application.

## Architecture Overview

The Google Photos integration uses OAuth 2.0 with PKCE for secure authentication and token management. Key features:

- Automatic token refresh
- Connection status tracking
- Token caching
- PKCE security

## Common Issues and Troubleshooting

### Authentication Issues

When users report they cannot connect to Google Photos:

1. Check the user's `connectionStatus` in the database:

   ```javascript
   db.users.findOne({ email: "user@example.com" }, { googlePhotos: 1 });
   ```

2. Look for these status values:

   - `connected` - Normal operation
   - `needs_reconnect` - Refresh token has failed, user needs to authenticate again
   - `disconnected` - User has manually disconnected

3. If status is `needs_reconnect`, ask the user to:
   - Go to the settings screen
   - Click "Disconnect Google Photos"
   - Then "Connect Google Photos" to establish a fresh connection

### Reset Script Usage

For severe issues, you can use the reset script to completely remove a user's Google Photos connection:

```bash
# Development environment
ts-node scripts/reset-google-photos.ts <userId>

# Production environment (after build)
node dist/scripts/reset-google-photos.js <userId>
```

**Important**: This should only be used as a last resort. The script will:

- Remove all Google Photos tokens and data from the user's profile
- Clear token caches
- Force the user to completely reconnect and select an album again

### Token Refresh Issues

Problems with token refresh usually indicate:

1. User revoked access in their Google account
2. Google API credentials have changed
3. Scopes were modified

Check application logs for:

- "Error refreshing token" messages
- "No refresh token available" warnings
- Connection status updates

### Monitoring Connection Health

To monitor overall connection health:

```javascript
// Count users by connection status
db.users.aggregate([
  { $match: { "googlePhotos.tokens": { $exists: true } } },
  { $group: { _id: "$googlePhotos.connectionStatus", count: { $sum: 1 } } },
]);

// Find users needing reconnection
db.users.find(
  { "googlePhotos.connectionStatus": "needs_reconnect" },
  { username: 1, email: 1 }
);
```

## Security Considerations

The integration implements important security features:

1. **PKCE Flow**: Protects against CSRF and authorization code interception
2. **State Parameter**: Additional CSRF protection
3. **Token Caching**: Improves performance but never persists tokens outside the database
4. **Connection Status**: Explicitly tracks authentication state
5. **Minimal Scopes**: Only requests the permissions we need

## Configuration

The following environment variables control the Google Photos integration:

```
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://your-api-url/api/photos/auth-callback
```

## Support Process

When a user reports issues with Google Photos:

1. Check their connection status in the database
2. Review logs for authentication errors related to their user ID
3. If needed, use the reset script to clear their connection
4. Guide them through reconnecting to Google Photos
5. Verify they select an album for rewards

## Best Practices

1. Never share Google API credentials
2. Don't modify OAuth scopes without understanding the impact
3. Monitor connection status metrics to identify trends
4. Use the reset script sparingly
5. Keep Google Cloud Console configuration in sync with application settings
