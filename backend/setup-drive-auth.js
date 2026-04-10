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
      if (err) {
        console.error('\n❌ Error retrieving access token:', err.message);
        console.log('\n💡 TIP: Authorization codes are ONE-TIME USE.');
        console.log('If you get "invalid_grant", you MUST run this script again and');
        console.log('CLICK THE LINK AGAIN to get a brand new code.\n');
        return;
      }
      oAuth2Client.setCredentials(token);
      
      // Check if config dir exists
      if (!fs.existsSync(path.join(__dirname, 'config'))) {
         fs.mkdirSync(path.join(__dirname, 'config'));
      }

      // Save the token to disk for later program executions
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
      console.log('\n✅ Token stored successfully in:', TOKEN_PATH);
      
      // Generate and display Base64 version for Render/DigitalOcean
      const tokenB64 = Buffer.from(JSON.stringify(token)).toString('base64');
      fs.writeFileSync(path.join(__dirname, 'latest-token-b64.txt'), tokenB64);
      
      // Also get Credentials B64
      const credsContent = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
      const credsB64 = Buffer.from(credsContent).toString('base64');
      
      console.log('\n======================================================');
      console.log('🚀 RENDER DEPLOYMENT - UPDATE BOTH KEYS:');
      console.log('\n1️⃣  GOOGLE_OAUTH_CREDENTIALS_BASE64:');
      console.log(credsB64);
      
      console.log('\n2️⃣  GOOGLE_OAUTH_TOKEN_BASE64:');
      console.log(tokenB64);
      
      console.log('\n======================================================');
      console.log('✅ STEPS:');
      console.log('1. Go to Render Dashboard -> Environment');
      console.log('2. Update BOTH variables with the strings above');
      console.log('3. Save and wait for redeploy');
      console.log('======================================================\n');
      
      console.log('You can now use Bulk Upload in your Offer Editor!');
      process.exit(0);
    });
  });
}

// Load client secrets from a local file.
function startAuth() {
  fs.readFile(CREDENTIALS_PATH, (err, content) => {
    if (err) {
      console.log('\n❌ Error loading client secret file:', err);
      // ... (existing error instructions)
      return;
    }
    
    const credentials = JSON.parse(content);
    const {client_secret, client_id, redirect_uris} = credentials.web || credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0] || 'http://localhost:3000/oauth2callback');
  
    getNewToken(oAuth2Client);
  });
}

startAuth();
