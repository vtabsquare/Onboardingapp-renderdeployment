/**
 * Shared Google OAuth2 client factory.
 *
 * Problem solved:
 *   Google's `invalid_grant` error occurs when the stored refresh token has
 *   expired or been revoked, AND/OR when a new access token is fetched but the
 *   updated token is never written back to disk.  Subsequent requests then
 *   re-send the original (now stale) token and Google rejects it.
 *
 * Fix:
 *   We attach a `tokens` event listener to the OAuth2 client.  Every time the
 *   googleapis library auto-refreshes an access token it emits this event with
 *   the new credentials.  We merge those credentials with whatever is already
 *   stored (so we never lose the refresh_token) and write the result back to
 *   token.json immediately.
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, '../oauth2-credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

/**
 * Build and return an authenticated OAuth2 client.
 * The client will automatically persist refreshed tokens to disk.
 *
 * @returns {google.auth.OAuth2}
 */
function getOAuth2Client() {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
        throw new Error(
            'oauth2-credentials.json not found. Please add your Google OAuth2 credentials.'
        );
    }
    if (!fs.existsSync(TOKEN_PATH)) {
        throw new Error(
            'config/token.json not found. Please run: node setup-drive-auth.js'
        );
    }

    const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    const { client_id, client_secret, redirect_uris } = creds.web || creds.installed;

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Load stored token (includes refresh_token)
    let storedToken;
    try {
        const tokenContent = fs.readFileSync(TOKEN_PATH, 'utf8');
        storedToken = JSON.parse(tokenContent);
    } catch (err) {
        throw new Error(
            `Failed to parse config/token.json: ${err.message}. ` +
            'Your Google Auth token might be corrupted. Please run node setup-drive-auth.js to regenerate it.'
        );
    }
    oAuth2Client.setCredentials(storedToken);

    // ✅ KEY FIX: Whenever the access token is automatically refreshed,
    //    persist the new credentials so future server restarts still work.
    oAuth2Client.on('tokens', (newTokens) => {
        try {
            // Read the current file so we never accidentally lose refresh_token
            let existing = {};
            if (fs.existsSync(TOKEN_PATH)) {
                existing = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
            }
            const merged = { ...existing, ...newTokens };
            fs.writeFileSync(TOKEN_PATH, JSON.stringify(merged, null, 2));
            console.log('[GoogleAuth] Token refreshed and saved to disk ✅');
        } catch (err) {
            console.error('[GoogleAuth] Failed to persist refreshed token:', err.message);
        }
    });

    return oAuth2Client;
}

module.exports = { getOAuth2Client };
