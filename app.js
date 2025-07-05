// Stream Deck Plugin for Kick Clip Creation
// Author: BigChiefRick

let websocket = null;
let uuid = null;

// Kick API configuration
const KICK_API_BASE = 'https://kick.com/api/public/v1';
const KICK_OAUTH_BASE = 'https://id.kick.com/oauth';
const CHANNEL_NAME = 'ticklefitz';
const CLIENT_ID = '01JZE5QW8R70MSNX3R221D52P3';
const REDIRECT_URI = 'http://127.0.0.1:8080/callback';

// Connect to Stream Deck
function connectElgatoStreamDeckSocket(inPort, inUUID, inRegisterEvent, inInfo, inActionInfo) {
    uuid = inUUID;
    
    websocket = new WebSocket('ws://localhost:' + inPort);
    
    websocket.onopen = function() {
        const json = {
            event: inRegisterEvent,
            uuid: inUUID
        };
        websocket.send(JSON.stringify(json));
    };
    
    websocket.onmessage = function(evt) {
        const jsonObj = JSON.parse(evt.data);
        const event = jsonObj.event;
        const action = jsonObj.action;
        const context = jsonObj.context;
        
        if (event === 'keyDown') {
            handleKeyDown(context, jsonObj.payload);
        } else if (event === 'willAppear') {
            handleWillAppear(context, jsonObj.payload);
        }
    };
}

// Handle key press
async function handleKeyDown(context, payload) {
    try {
        // Show processing state
        setTitle(context, 'Starting...');
        
        // Get settings
        const settings = payload.settings || {};
        const accessToken = settings.accessToken;
        const channelSlug = settings.channelSlug || CHANNEL_NAME;
        
        if (!accessToken) {
            setTitle(context, 'No Auth');
            setTimeout(() => setTitle(context, 'Kick Clip'), 2000);
            return;
        }
        
        // Check if token is expired and refresh if needed
        const validToken = await ensureValidToken(context, settings);
        if (!validToken) {
            setTitle(context, 'Auth Error');
            setTimeout(() => setTitle(context, 'Kick Clip'), 2000);
            return;
        }
        
        setTitle(context, 'Creating...');
        
        // Create clip (note: clip endpoint may not be available yet in Kick API)
        // For now, we'll just test the authentication and post a message
        await testClipCreation(validToken, channelSlug);
        
        setTitle(context, 'Success!');
        setTimeout(() => setTitle(context, 'Kick Clip'), 2000);
        
    } catch (error) {
        console.error('Error creating clip:', error);
        setTitle(context, 'Error');
        setTimeout(() => setTitle(context, 'Kick Clip'), 2000);
    }
}

// Handle will appear event
function handleWillAppear(context, payload) {
    setTitle(context, 'Kick Clip');
}

// Ensure we have a valid access token
async function ensureValidToken(context, settings) {
    try {
        // Check if token exists and is not expired
        if (settings.accessToken && settings.tokenExpiresAt) {
            const expiresAt = new Date(settings.tokenExpiresAt);
            const now = new Date();
            
            // If token expires within 5 minutes, refresh it
            if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
                return settings.accessToken;
            }
        }
        
        // Try to refresh token if we have a refresh token
        if (settings.refreshToken) {
            const newTokens = await refreshAccessToken(settings.refreshToken);
            if (newTokens) {
                // Save new tokens
                const newSettings = {
                    ...settings,
                    accessToken: newTokens.access_token,
                    refreshToken: newTokens.refresh_token,
                    tokenExpiresAt: new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
                };
                
                saveSettings(context, newSettings);
                return newTokens.access_token;
            }
        }
        
        return null;
        
    } catch (error) {
        console.error('Error ensuring valid token:', error);
        return null;
    }
}

// Refresh access token using refresh token
async function refreshAccessToken(refreshToken) {
    try {
        const response = await fetch(`${KICK_OAUTH_BASE}/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: CLIENT_ID,
                refresh_token: refreshToken
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('Error refreshing token:', error);
        throw error;
    }
}

// Test clip creation (placeholder since clip endpoint may not be available)
async function testClipCreation(accessToken, channelSlug) {
    try {
        // First, test if we can access user info to verify token works
        const userResponse = await fetch(`${KICK_API_BASE}/users`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });
        
        if (!userResponse.ok) {
            throw new Error(`User API error! status: ${userResponse.status}`);
        }
        
        // TODO: Replace this with actual clip creation once the endpoint is available
        // For now, we'll just verify the authentication works
        console.log('Authentication successful - ready for clip creation when API supports it');
        
        return { success: true };
        
    } catch (error) {
        console.error('Error in test clip creation:', error);
        throw error;
    }
}

// Utility function to save settings
function saveSettings(context, settings) {
    if (websocket && websocket.readyState === 1) {
        const json = {
            event: 'setSettings',
            context: context,
            payload: settings
        };
        websocket.send(JSON.stringify(json));
    }
}
function setTitle(context, title) {
    if (websocket && websocket.readyState === 1) {
        const json = {
            event: 'setTitle',
            context: context,
            payload: {
                title: title,
                target: 0
            }
        };
        websocket.send(JSON.stringify(json));
    }
}

// Export for Stream Deck
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { connectElgatoStreamDeckSocket };
}
