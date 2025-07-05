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

// Get App Access Token using XMLHttpRequest (fetch not available in Stream Deck)
function getAppAccessToken() {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://id.kick.com/oauth/token', true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        console.log('App access token obtained successfully');
                        resolve(data.access_token);
                    } catch (error) {
                        console.error('Error parsing token response:', error);
                        reject(error);
                    }
                } else {
                    console.error('Token request failed:', xhr.status, xhr.responseText);
                    reject(new Error(`HTTP error! status: ${xhr.status}`));
                }
            }
        };
        
        xhr.onerror = function() {
            console.error('Network error getting token');
            reject(new Error('Network error'));
        };
        
        const params = `grant_type=client_credentials&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`;
        xhr.send(params);
    });
}

// Test clip creation and API access using XMLHttpRequest
function testClipCreation(accessToken, channelSlug) {
    return new Promise((resolve) => {
        // First, test if we can access channel info
        console.log(`Testing API access for channel: ${channelSlug}`);
        
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${KICK_API_BASE}/channels/${channelSlug}`, true);
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
        xhr.setRequestHeader('Accept', 'application/json');
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                console.log(`Channel API response: ${xhr.status}`);
                
                if (xhr.status === 403) {
                    resolve({
                        success: false,
                        message: 'API 403'
                    });
                    return;
                }
                
                if (xhr.status !== 200) {
                    resolve({
                        success: false,
                        message: `API ${xhr.status}`
                    });
                    return;
                }
                
                try {
                    const channelData = JSON.parse(xhr.responseText);
                    console.log('Channel data received:', {
                        slug: channelData.slug,
                        user_id: channelData.user_id,
                        is_live: channelData.livestream?.is_live || false
                    });
                    
                    // For now, just test API connectivity - clip endpoints likely not available
                    resolve({
                        success: true,
                        message: 'API Works!'
                    });
                    
                } catch (error) {
                    console.error('Error parsing channel response:', error);
                    resolve({
                        success: false,
                        message: 'Parse Error'
                    });
                }
            }
        };
        
        xhr.onerror = function() {
            console.error('Network error testing API');
            resolve({
                success: false,
                message: 'Network Error'
            });
        };
        
        xhr.send();
    });
}

// Post clip URL to chat (if chat API is available) using XMLHttpRequest
function postClipToChat(accessToken, channelSlug, clipUrl) {
    return new Promise((resolve) => {
        console.log('Attempting to post clip to chat...');
        
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${KICK_API_BASE}/channels/${channelSlug}/chatroom/messages`, true);
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Accept', 'application/json');
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    console.log('✅ Posted clip to chat successfully');
                } else {
                    console.log('Chat posting failed:', xhr.status);
                }
                resolve();
            }
        };
        
        xhr.onerror = function() {
            console.log('Chat posting error');
            resolve();
        };
        
        const message = JSON.stringify({
            content: `🎬 New clip created: ${clipUrl}`,
            type: 'message'
        });
        
        xhr.send(message);
    });
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
