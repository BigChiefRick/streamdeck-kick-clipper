// Stream Deck Plugin for Kick Clip Creation
// Author: BigChiefRick

console.log('Kick Clip Plugin loading...');

let websocket = null;
let uuid = null;

// Kick API configuration
const KICK_API_BASE = 'https://kick.com/api/public/v1';
const CHANNEL_NAME = 'ticklefitz';
const CLIENT_ID = '01JZE5QW8R70MSNX3R221D52P3';
const CLIENT_SECRET = '2a6b062e6f7e02de87c67a8e14e1ecb6e32e31fa03843d2e0df225b0efae8d23';

// Connect to Stream Deck
function connectElgatoStreamDeckSocket(inPort, inUUID, inRegisterEvent, inInfo, inActionInfo) {
    console.log('connectElgatoStreamDeckSocket called');
    uuid = inUUID;
    
    try {
        websocket = new WebSocket('ws://localhost:' + inPort);
        
        websocket.onopen = function() {
            console.log('WebSocket connected');
            const json = {
                event: inRegisterEvent,
                uuid: inUUID
            };
            websocket.send(JSON.stringify(json));
            console.log('Registration sent');
        };
        
        websocket.onmessage = function(evt) {
            console.log('WebSocket message received');
            const jsonObj = JSON.parse(evt.data);
            const event = jsonObj.event;
            const context = jsonObj.context;
            
            if (event === 'keyDown') {
                console.log('Key pressed - starting clip creation');
                handleKeyDown(context, jsonObj.payload);
            } else if (event === 'willAppear') {
                console.log('Will appear event');
                handleWillAppear(context, jsonObj.payload);
            }
        };
        
        websocket.onerror = function(error) {
            console.error('WebSocket error:', error);
        };
        
        websocket.onclose = function() {
            console.log('WebSocket closed');
        };
        
    } catch (error) {
        console.error('Error creating WebSocket:', error);
    }
}

// Handle key press
function handleKeyDown(context, payload) {
    console.log('handleKeyDown called');
    
    // Show processing state
    setTitle(context, 'Starting...');
    
    // Get settings
    const settings = payload.settings || {};
    const channelSlug = settings.channelSlug || CHANNEL_NAME;
    
    // Get App Access Token and test API
    setTitle(context, 'Auth...');
    
    getAppAccessToken()
        .then(function(accessToken) {
            if (!accessToken) {
                setTitle(context, 'Auth Failed');
                setTimeout(function() { setTitle(context, 'Kick Clip'); }, 2000);
                return;
            }
            
            console.log('Got access token, testing API...');
            setTitle(context, 'Testing...');
            
            return testClipCreation(accessToken, channelSlug);
        })
        .then(function(result) {
            if (result && result.success) {
                setTitle(context, 'Success!');
            } else {
                setTitle(context, result ? result.message : 'Failed');
            }
            
            setTimeout(function() { setTitle(context, 'Kick Clip'); }, 3000);
        })
        .catch(function(error) {
            console.error('Error in clip creation:', error);
            setTitle(context, 'Error');
            setTimeout(function() { setTitle(context, 'Kick Clip'); }, 2000);
        });
}

// Handle will appear event
function handleWillAppear(context, payload) {
    console.log('handleWillAppear called');
    setTitle(context, 'Kick Clip');
}

// Get App Access Token using XMLHttpRequest
function getAppAccessToken() {
    console.log('Getting app access token...');
    
    return new Promise(function(resolve, reject) {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://id.kick.com/oauth/token', true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                console.log('Token request completed with status:', xhr.status);
                
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
                    reject(new Error('HTTP error! status: ' + xhr.status));
                }
            }
        };
        
        xhr.onerror = function() {
            console.error('Network error getting token');
            reject(new Error('Network error'));
        };
        
        const params = 'grant_type=client_credentials&client_id=' + CLIENT_ID + '&client_secret=' + CLIENT_SECRET;
        xhr.send(params);
    });
}

// Test clip creation and API access
function testClipCreation(accessToken, channelSlug) {
    console.log('Testing API access for channel:', channelSlug);
    
    return new Promise(function(resolve) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', KICK_API_BASE + '/channels/' + channelSlug, true);
        xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
        xhr.setRequestHeader('Accept', 'application/json');
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                console.log('Channel API response:', xhr.status);
                
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
                        message: 'API ' + xhr.status
                    });
                    return;
                }
                
                try {
                    const channelData = JSON.parse(xhr.responseText);
                    console.log('Channel data received successfully');
                    
                    // For now, just test API connectivity
                    resolve({
                        success: true,
                        message: 'Works!'
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

// Utility function to set button title
function setTitle(context, title) {
    console.log('Setting title:', title);
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
    } else {
        console.log('WebSocket not ready for setTitle');
    }
}

console.log('Plugin script loaded');

// Export for Stream Deck
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { connectElgatoStreamDeckSocket };
}
