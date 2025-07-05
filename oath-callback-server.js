// Simple OAuth callback server for Stream Deck plugin
// This needs to run separately to handle the OAuth callback

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const CLIENT_ID = '01JZE5QW8R70MSNX3R221D52P3';
const CLIENT_SECRET = '2a6b062e6f7e02de87c67a8e14e1ecb6e32e31fa03843d2e0df225b0efae8d23';
const REDIRECT_URI = 'http://127.0.0.1:8080/callback';
const KICK_OAUTH_BASE = 'https://id.kick.com/oauth';

let server = null;

// Start the OAuth callback server
function startServer() {
    return new Promise((resolve, reject) => {
        server = http.createServer(async (req, res) => {
            const parsedUrl = url.parse(req.url, true);
            
            if (parsedUrl.pathname === '/callback') {
                const { code, state, error } = parsedUrl.query;
                
                if (error) {
                    res.writeHead(400, { 'Content-Type': 'text/html' });
                    res.end(`
                        <html>
                        <body>
                            <h1>Authentication Error</h1>
                            <p>Error: ${error}</p>
                            <p>You can close this window.</p>
                        </body>
                        </html>
                    `);
                    return;
                }
                
                if (code) {
                    try {
                        // Exchange code for tokens
                        const tokens = await exchangeCodeForTokens(code);
                        
                        // Save tokens to a file that the Stream Deck plugin can read
                        const tokenData = {
                            access_token: tokens.access_token,
                            refresh_token: tokens.refresh_token,
                            expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
                            timestamp: Date.now()
                        };
                        
                        const tokenFile = path.join(__dirname, 'tokens.json');
                        fs.writeFileSync(tokenFile, JSON.stringify(tokenData, null, 2));
                        
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(`
                            <html>
                            <body>
                                <h1>Authentication Successful!</h1>
                                <p>You have successfully authenticated with Kick.</p>
                                <p>You can now close this window and return to your Stream Deck.</p>
                                <script>
                                    setTimeout(() => {
                                        window.close();
                                    }, 3000);
                                </script>
                            </body>
                            </html>
                        `);
                        
                        console.log('✅ OAuth tokens saved successfully');
                        
                        // Auto-shutdown server after successful auth
                        setTimeout(() => {
                            stopServer();
                        }, 5000);
                        
                    } catch (error) {
                        console.error('Error exchanging code for tokens:', error);
                        res.writeHead(500, { 'Content-Type': 'text/html' });
                        res.end(`
                            <html>
                            <body>
                                <h1>Token Exchange Error</h1>
                                <p>Error: ${error.message}</p>
                                <p>You can close this window.</p>
                            </body>
                            </html>
                        `);
                    }
                } else {
                    res.writeHead(400, { 'Content-Type': 'text/html' });
                    res.end(`
                        <html>
                        <body>
                            <h1>Missing Authorization Code</h1>
                            <p>No authorization code received.</p>
                            <p>You can close this window.</p>
                        </body>
                        </html>
                    `);
                }
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not found');
            }
        });
        
        server.listen(8080, '127.0.0.1', () => {
            console.log('OAuth callback server running on http://127.0.0.1:8080');
            resolve();
        });
        
        server.on('error', (err) => {
            reject(err);
        });
    });
}

// Stop the server
function stopServer() {
    if (server) {
        server.close(() => {
            console.log('OAuth callback server stopped');
        });
        server = null;
    }
}

// Exchange authorization code for access tokens
async function exchangeCodeForTokens(code) {
    const response = await fetch(`${KICK_OAUTH_BASE}/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            code: code
        })
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
    }
    
    return await response.json();
}

// Generate OAuth authorization URL
function generateAuthURL() {
    const state = Math.random().toString(36).substring(2, 15);
    
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        scope: 'user:read channel:read chat:send',
        state: state
    });
    
    return `${KICK_OAUTH_BASE}/authorize?${params.toString()}`;
}

// Main function
async function main() {
    try {
        await startServer();
        
        const authURL = generateAuthURL();
        console.log('\n🚀 OAuth Authentication Process:');
        console.log('1. Server is running on http://127.0.0.1:8080');
        console.log('2. Open this URL in your browser:');
        console.log(`   ${authURL}`);
        console.log('3. Complete the authentication process');
        console.log('4. Tokens will be saved to tokens.json');
        console.log('\nWaiting for authentication...\n');
        
        // Open the URL automatically (works on Windows)
        const { exec } = require('child_process');
        exec(`start "" "${authURL}"`);
        
    } catch (error) {
        console.error('Error starting OAuth server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down OAuth server...');
    stopServer();
    process.exit(0);
});

// Run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = { startServer, stopServer, generateAuthURL };
