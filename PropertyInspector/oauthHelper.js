// OAuth Helper for Kick Authentication
// Author: BigChiefRick

const CLIENT_ID = '01JZE5QW8R70MSNX3R221D52P3';
const CLIENT_SECRET = '2a6b062e6f7e02de87c67a8e14e1ecb6e32e31fa03843d2e0df225b0efae8d23';
const REDIRECT_URI = 'http://127.0.0.1:8080/callback';
const KICK_OAUTH_BASE = 'https://id.kick.com/oauth';

// Generate OAuth authorization URL
function generateAuthURL() {
    // Generate state and code verifier for PKCE
    const state = generateRandomString(32);
    const codeVerifier = generateRandomString(128);
    const codeChallenge = btoa(String.fromCharCode.apply(null, 
        new Uint8Array(
            new TextEncoder().encode(codeVerifier)
        )
    )).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    
    // Store for later use
    localStorage.setItem('oauth_state', state);
    localStorage.setItem('oauth_code_verifier', codeVerifier);
    
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        scope: 'user:read channel:read chat:send', // Add appropriate scopes
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state: state
    });
    
    return `${KICK_OAUTH_BASE}/authorize?${params.toString()}`;
}

// Exchange authorization code for access token
async function exchangeCodeForToken(code, state) {
    try {
        // Verify state matches
        const savedState = localStorage.getItem('oauth_state');
        if (state !== savedState) {
            throw new Error('Invalid state parameter');
        }
        
        const codeVerifier = localStorage.getItem('oauth_code_verifier');
        if (!codeVerifier) {
            throw new Error('Code verifier not found');
        }
        
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
                code_verifier: codeVerifier,
                code: code
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
        }
        
        const tokens = await response.json();
        
        // Clean up stored values
        localStorage.removeItem('oauth_state');
        localStorage.removeItem('oauth_code_verifier');
        
        return tokens;
        
    } catch (error) {
        console.error('Error exchanging code for token:', error);
        throw error;
    }
}

// Generate random string for state and code verifier
function generateRandomString(length) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
}

// Start local server to handle OAuth callback
class OAuthServer {
    constructor() {
        this.server = null;
        this.port = 8080;
    }
    
    async start() {
        return new Promise((resolve, reject) => {
            try {
                // Note: This is a simplified version - in a real implementation,
                // you'd need to use Node.js http server or similar
                // For now, we'll use a different approach
                
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }
    
    stop() {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }
}

// Test authentication with current token
async function testAuthentication(accessToken) {
    try {
        const response = await fetch('https://kick.com/api/public/v1/users', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Authentication test failed: ${response.status}`);
        }
        
        const userData = await response.json();
        return userData;
        
    } catch (error) {
        console.error('Authentication test error:', error);
        throw error;
    }
}
