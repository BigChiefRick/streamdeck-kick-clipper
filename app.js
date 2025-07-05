// Stream Deck Plugin for Kick Clip Creation
// Author: BigChiefRick

let websocket = null;
let uuid = null;

// Kick API configuration
const KICK_API_BASE = 'https://kick.com/api/public/v1';
const CHANNEL_NAME = 'ticklefitz';
const CLIENT_ID = '01JZE5QW8R70MSNX3R221D52P3';
const CLIENT_SECRET = '2a6b062e6f7e02de87c67a8e14e1ecb6e32e31fa03843d2e0df225b0efae8d23';

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
        const channelSlug = settings.channelSlug || CHANNEL_NAME;
        
        // Get App Access Token
        setTitle(context, 'Auth...');
        const accessToken = await getAppAccessToken();
        
        if (!accessToken) {
            setTitle(context, 'Auth Failed');
            setTimeout(() => setTitle(context, 'Kick Clip'), 2000);
            return;
        }
        
        setTitle(context, 'Testing...');
        
        // Test API access and check for clip endpoints
        const result = await testClipCreation(accessToken, channelSlug);
        
        if (result.success) {
            setTitle(context, 'Success!');
        } else {
            setTitle(context, result.message || 'Failed');
        }
        
        setTimeout(() => setTitle(context, 'Kick Clip'), 3000);
        
    } catch (error) {
        console.error('Error in clip creation:', error);
        setTitle(context, 'Error');
        setTimeout(() => setTitle(context, 'Kick Clip'), 2000);
    }
}

// Handle will appear event
function handleWillAppear(context, payload) {
    setTitle(context, 'Kick Clip');
}

// Get App Access Token
async function getAppAccessToken() {
    try {
        const response = await fetch('https://id.kick.com/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('App access token obtained successfully');
        return data.access_token;
        
    } catch (error) {
        console.error('Error getting app access token:', error);
        return null;
    }
}

// Test clip creation and API access
async function testClipCreation(accessToken, channelSlug) {
    try {
        // First, test if we can access channel info
        console.log(`Testing API access for channel: ${channelSlug}`);
        
        const channelResponse = await fetch(`${KICK_API_BASE}/channels/${channelSlug}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });
        
        console.log(`Channel API response: ${channelResponse.status}`);
        
        if (channelResponse.status === 403) {
            return {
                success: false,
                message: 'API 403'
            };
        }
        
        if (!channelResponse.ok) {
            return {
                success: false,
                message: `API ${channelResponse.status}`
            };
        }
        
        const channelData = await channelResponse.json();
        console.log('Channel data received:', {
            slug: channelData.slug,
            user_id: channelData.user_id,
            is_live: channelData.livestream?.is_live || false
        });
        
        // Try to find clip creation endpoint
        // Note: Clip endpoint might not be publicly available yet
        try {
            console.log('Testing clip creation endpoint...');
            const clipResponse = await fetch(`${KICK_API_BASE}/channels/${channelSlug}/clips`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    duration: 30,
                    title: `Test clip from Stream Deck - ${new Date().toLocaleString()}`
                })
            });
            
            console.log(`Clip creation response: ${clipResponse.status}`);
            
            if (clipResponse.ok) {
                const clipData = await clipResponse.json();
                console.log('✅ Clip created successfully!', clipData);
                
                // Try to post to chat if clip was created
                if (clipData.url || clipData.clip_url) {
                    await postClipToChat(accessToken, channelSlug, clipData.url || clipData.clip_url);
                }
                
                return {
                    success: true,
                    message: 'Clip OK!'
                };
            } else {
                const errorText = await clipResponse.text();
                console.log('Clip creation failed:', errorText);
                
                if (clipResponse.status === 404) {
                    return {
                        success: false,
                        message: 'No Clips API'
                    };
                } else if (clipResponse.status === 403) {
                    return {
                        success: false,
                        message: 'Clips 403'
                    };
                } else {
                    return {
                        success: false,
                        message: `Clips ${clipResponse.status}`
                    };
                }
            }
        } catch (clipError) {
            console.log('Clip endpoint test failed:', clipError.message);
            return {
                success: false,
                message: 'No Clips'
            };
        }
        
    } catch (error) {
        console.error('Error in test clip creation:', error);
        return {
            success: false,
            message: 'Error'
        };
    }
}

// Post clip URL to chat (if chat API is available)
async function postClipToChat(accessToken, channelSlug, clipUrl) {
    try {
        console.log('Attempting to post clip to chat...');
        
        // This is speculative - chat API might not be available with App tokens
        const chatResponse = await fetch(`${KICK_API_BASE}/channels/${channelSlug}/chatroom/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                content: `🎬 New clip created: ${clipUrl}`,
                type: 'message'
            })
        });
        
        if (chatResponse.ok) {
            console.log('✅ Posted clip to chat successfully');
        } else {
            console.log('Chat posting failed:', chatResponse.status);
        }
        
    } catch (error) {
        console.log('Chat posting error:', error.message);
    }
}

// Utility function to set button title
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
