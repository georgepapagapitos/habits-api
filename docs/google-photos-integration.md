# Google Photos Integration

This document explains the architecture and best practices used in our Google Photos integration.

## Architecture Overview

Our Google Photos integration follows OAuth 2.0 best practices with enhanced security features:

1. **Token Management Service**: Centralized service for handling OAuth tokens
2. **PKCE Authentication Flow**: Protection against CSRF and authorization code interception attacks
3. **Automatic Token Refresh**: Seamless refresh of expired tokens
4. **Connection Status Tracking**: Explicit tracking of connection state
5. **Caching**: Performance optimization through token caching

## Key Components

### TokenManagerService

The TokenManagerService handles all OAuth token operations:

- Token retrieval with automatic refresh
- Token validation and expiration checking
- Token caching for performance
- Token exchange for authorization codes

```typescript
// Example: Getting a valid access token
const accessToken = await tokenManager.getGoogleAccessToken(userId);
```

### PKCE Implementation

We use PKCE (Proof Key for Code Exchange) to enhance OAuth security:

1. Generate a code verifier (random string)
2. Create a code challenge (hash of verifier)
3. Send challenge with authorization request
4. Verify code exchange with original verifier

```typescript
// Generate auth URL with PKCE
const { authUrl, codeVerifier } = googlePhotosService.getAuthUrlWithPKCE(state);

// Store verifier securely with the state as key
storeCodeVerifier(state, codeVerifier);

// Later, during code exchange
const verifier = getCodeVerifier(state);
const tokens = await googlePhotosService.getTokensFromCode(code, verifier);
```

### Connection Status Tracking

We track the connection status explicitly in the user document:

- `connected`: Normal connected state
- `needs_reconnect`: The refresh token is invalid or expired
- `disconnected`: User has explicitly disconnected

This helps provide clear user feedback when authentication needs to be refreshed.

## Error Handling & Recovery

Our integration includes robust error handling:

1. **Automatic Recovery**: Attempts to refresh tokens when they expire
2. **Explicit State Transitions**: Clear state changes when authentication issues occur
3. **User-Friendly Errors**: Specific error messages guide users on how to resolve issues
4. **Self-Healing**: Automatic reconnection flow when possible

## Best Practices Implemented

1. **Always Using Offline Access**: We always request offline access to get refresh tokens
2. **PKCE for Public Clients**: Enhanced security against authorization code interception
3. **Token Caching**: Performance optimization by caching valid tokens
4. **Token Refresh Preservation**: Careful preservation of refresh tokens
5. **Connection Status**: Explicit tracking of connection state
6. **Incremental Authorization**: Only requesting permissions we need
7. **State Parameter**: Protection against CSRF attacks

## User Experience

From the user perspective, the flow is simple:

1. User clicks "Connect Google Photos"
2. User authenticates with Google and grants permissions
3. User selects an album for rewards
4. System automatically manages token refresh in the background
5. If authentication issues occur, user is prompted to reconnect

## Troubleshooting

Common issues and solutions:

1. **No Refresh Token**: Check that you're using `access_type=offline` and `prompt=consent`
2. **Token Refresh Failures**: Usually indicates revoked access or changed scopes
3. **Rate Limiting**: Implement exponential backoff for API requests
4. **Missing Permissions**: Ensure you're requesting the correct scopes

## Security Considerations

Our implementation follows these security best practices:

1. **PKCE**: Protection against code interception attacks
2. **State Parameter**: Protection against CSRF attacks
3. **Minimal Scopes**: Only requesting the permissions we need
4. **Input Validation**: Validating all user inputs and parameters
5. **Error Handling**: Not exposing sensitive information in errors

## Expanding the Integration

To add support for additional OAuth providers:

1. Extend the TokenManagerService with provider-specific methods
2. Add new schema fields for the provider's tokens
3. Implement PKCE flow for the new provider
4. Add appropriate error handling and status tracking
