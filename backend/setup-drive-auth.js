const { google } = require('googleapis');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

// Replace these with your OAuth 2.0 Web Client credentials from Google Cloud Console
// Ensure you add "http://localhost:3000/oauth2callback" as an authorized redirect URI for the client
const CREDENTIALS_PATH = path.join(__dirname, 'oauth2-credentials.json');
const TOKEN_PATH = path.join(__dirname, 'config', 'token.json');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

/**
 * Prompt user to authorize the app and get a token.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // Forces consent screen to get a refresh token
  });
  console.log('\n======================================================');
  console.log('1. Click this URL inside your browser (or copy-paste it):');
  console.log('\n', authUrl, '\n');
  console.log('2. Log in with your Google Account and click "Allow"');
  console.log('3. You will be redirected to a broken page (localhost:3000) - THAT EXPECTIONAL!');
  console.log('4. Copy the entire URL of that broken page (it has a `code=` inside it)');
  console.log('======================================================\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Paste the entire redirected URL here: ', (url) => {
    rl.close();
    
    let code;
    try {
        const urlObj = new URL(url);
        code = urlObj.searchParams.get('code');
    } catch {
        code = url; // fallback if they just pasted the code
    }

    if (!code) {
        console.error('Could not extract code from that URL. Try again.');
        return;
    }

    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      
      // Check if config dir exists
      if (!fs.existsSync(path.join(__dirname, 'config'))) {
         fs.mkdirSync(path.join(__dirname, 'config'));
      }

      // Save the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token, null, 2), (err) => {
        if (err) return console.error(err);
        console.log('\n✅ Token stored successfully in:', TOKEN_PATH);
        console.log('You can now use Bulk Upload in your Offer Editor!');
        process.exit(0);
      });
    });
  });
}

// Load client secrets from a local file.
fs.readFile(CREDENTIALS_PATH, (err, content) => {
  if (err) {
    console.log('\n❌ Error loading client secret file:', err);
    console.log('\nPLEASE FOLLOW THESE STEPS:');
    console.log('1. Go to Google Cloud Console > APIs & Services > Credentials');
    console.log('2. Click "Create Credentials" > "OAuth client ID"');
    console.log('3. Application type: "Web application"');
    console.log('4. Name: "MyApp" (or whatever)');
    console.log('5. Authorized redirect URIs: Add "http://localhost:3000/oauth2callback"');
    console.log('6. Click Create, then Download the JSON file.');
    console.log('7. Put that downloaded file in the backend folder and rename it to "oauth2-credentials.json"');
    console.log('8. Re-run this script: node setup-drive-auth.js\n');
    return;
  }
  
  // Authorize a client with credentials, then call the Google Drive API.
  const credentials = JSON.parse(content);
  // Support both "web" and "installed" (desktop) type credentials
  const {client_secret, client_id, redirect_uris} = credentials.web || credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0] || 'http://localhost:3000/oauth2callback');

  getNewToken(oAuth2Client);
});
