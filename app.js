// Stream Deck Plugin for Kick Clip Creation - Fixed Version
// Author: BigChiefRick
// Compatible with Stream Deck SDK

console.log('Kick Clip Plugin loading...');

var websocket = null;
var uuid = null;
var actionUUID = 'com.bigchiefrick.kickclipper.createclip';

// Plugin settings with defaults
var defaultSettings = {
    channelSlug: 'ticklefitz',
    clipDuration: 30,
    autoPostToChat: true,
    apiToken: ''
};

// Kick API configuration
var KICK_API_BASE = 'https://kick.com/api/v2';

// Connect to Stream Deck
function connectElgatoStreamDeckSocket(inPort, inUUID, inRegisterEvent, inInfo, inActionInfo) {
    console.log('connectElgatoStreamDeckSocket called with port:', inPort);
    uuid = inUUID;
    
    try {
        websocket = new WebSocket('ws://localhost:' + inPort);
        
        websocket.onopen = function() {
            console.log('WebSocket connected successfully');
            var json = {
                event: inRegisterEvent,
                uuid: inUUID
            };
            websocket.send(JSON.stringify(json));
            console.log('Registration sent to Stream Deck');
        };
        
        websocket.onmessage = function(evt) {
            try {
                var jsonObj = JSON.parse(evt.data);
                var event = jsonObj.event;
                var context = jsonObj.context;
                
                console.log('Received event:', event);
                
                switch (event) {
                    case 'keyDown':
                        handleKeyDown(context, jsonObj.payload);
                        break;
                    case 'willAppear':
                        handleWillAppear(context, jsonObj.payload);
                        break;
                    case 'willDisappear':
                        handleWillDisappear(context, jsonObj.payload);
                        break;
                    case 'didReceiveSettings':
                        handleDidReceiveSettings(context, jsonObj.payload);
                        break;
                    case 'propertyInspectorDidAppear':
                        handlePropertyInspectorDidAppear(context, jsonObj.payload);
                        break;
                    case 'sendToPlugin':
                        handleSendToPlugin(context, jsonObj.payload);
                        break;
                    default:
                        console.log('Unhandled event:', event);
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
        
        websocket.onerror = function(error) {
            console.error('WebSocket error:', error);
        };
        
        websocket.onclose = function() {
            console.log('WebSocket connection closed');
        };
        
    } catch (error) {
        console.error('Error creating WebSocket:', error);
    }
}

// Handle key press
function handleKeyDown(context, payload) {
    console.log('Key pressed - starting clip creation process');
    
    // Get settings with defaults
    var settings = mergeSettings(payload.settings);
    
    // Validate required settings
    if (!settings.apiToken || settings.apiToken.trim() === '') {
        setTitle(context, 'No Token');
        setTimeout(function() { 
            setTitle(context, 'Kick Clip'); 
        }, 2000);
        return;
    }
    
    // Show processing state
    setTitle(context, 'Creating...');
    
    // Create clip
    createKickClip(context, settings);
}

// Handle will appear event
function handleWillAppear(context, payload) {
    console.log('Action will appear');
    setTitle(context, 'Kick Clip');
    
    // Request settings
    requestSettings(context);
}

// Handle will disappear event
function handleWillDisappear(context, payload) {
    console.log('Action will disappear');
}

// Handle settings received
function handleDidReceiveSettings(context, payload) {
    console.log('Settings received:', payload.settings);
}

// Handle property inspector appeared
function handlePropertyInspectorDidAppear(context, payload) {
    console.log('Property inspector appeared');
    // Send current settings to PI
    sendToPropertyInspector(context, 'getSettings', payload.settings || {});
}

// Handle messages from property inspector
function handleSendToPlugin(context, payload) {
    console.log('Message from Property Inspector:', payload);
    
    if (payload.event === 'testConnection') {
        testConnection(context, payload.settings);
    } else if (payload.event === 'saveSettings') {
        saveSettings(context, payload.settings);
    }
}

// Create Kick clip
function createKickClip(context, settings) {
    console.log('Creating clip for channel:', settings.channelSlug);
    
    // First, get channel information
    getChannelInfo(settings.apiToken, settings.channelSlug)
        .then(function(channelData) {
            if (!channelData || !channelData.id) {
                throw new Error('Channel not found');
            }
            
            console.log('Channel found, ID:', channelData.id);
            setTitle(context, 'Clipping...');
            
            // Create the clip
            return createClip(settings.apiToken, channelData.id, settings.clipDuration);
        })
        .then(function(clipData) {
            if (!clipData || !clipData.clip_url) {
                throw new Error('Clip creation failed');
            }
            
            console.log('Clip created:', clipData.clip_url);
            setTitle(context, 'Success!');
            
            // Post to chat if enabled
            if (settings.autoPostToChat && clipData.chatroom_id) {
                return postToChat(settings.apiToken, clipData.chatroom_id, clipData.clip_url);
            }
            
            return Promise.resolve();
        })
        .then(function() {
            // Reset title after success
            setTimeout(function() {
                setTitle(context, 'Kick Clip');
            }, 3000);
        })
        .catch(function(error) {
            console.error('Error creating clip:', error);
            setTitle(context, 'Failed');
            setTimeout(function() {
                setTitle(context, 'Kick Clip');
            }, 2000);
        });
}

// Get channel information
function getChannelInfo(apiToken, channelSlug) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', KICK_API_BASE + '/channels/' + channelSlug, true);
        xhr.setRequestHeader('Authorization', 'Bearer ' + apiToken);
        xhr.setRequestHeader('Accept', 'application/json');
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        var data = JSON.parse(xhr.responseText);
                        resolve(data);
                    } catch (error) {
                        reject(new Error('Failed to parse channel response'));
                    }
                } else {
                    reject(new Error('Channel request failed: ' + xhr.status));
                }
            }
        };
        
        xhr.onerror = function() {
            reject(new Error('Network error getting channel info'));
        };
        
        xhr.send();
    });
}

// Create clip
function createClip(apiToken, channelId, duration) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', KICK_API_BASE + '/channels/' + channelId + '/clips', true);
        xhr.setRequestHeader('Authorization', 'Bearer ' + apiToken);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Accept', 'application/json');
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200 || xhr.status === 201) {
                    try {
                        var data = JSON.parse(xhr.responseText);
                        resolve(data);
                    } catch (error) {
                        reject(new Error('Failed to parse clip response'));
                    }
                } else {
                    reject(new Error('Clip creation failed: ' + xhr.status));
                }
            }
        };
        
        xhr.onerror = function() {
            reject(new Error('Network error creating clip'));
        };
        
        var clipData = {
            duration: duration || 30,
            title: 'Stream Deck Clip'
        };
        
        xhr.send(JSON.stringify(clipData));
    });
}

// Post clip URL to chat
function postToChat(apiToken, chatroomId, clipUrl) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', KICK_API_BASE + '/messages/send/' + chatroomId, true);
        xhr.setRequestHeader('Authorization', 'Bearer ' + apiToken);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Accept', 'application/json');
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200 || xhr.status === 201) {
                    console.log('Clip URL posted to chat');
                    resolve();
                } else {
                    console.warn('Failed to post to chat:', xhr.status);
                    resolve(); // Don't fail the whole process if chat posting fails
                }
            }
        };
        
        xhr.onerror = function() {
            console.warn('Network error posting to chat');
            resolve(); // Don't fail the whole process if chat posting fails
        };
        
        var messageData = {
            message: 'Check out this clip! ' + clipUrl,
            type: 'message'
        };
        
        xhr.send(JSON.stringify(messageData));
    });
}

// Test connection
function testConnection(context, settings) {
    console.log('Testing connection...');
    
    if (!settings.apiToken) {
        sendToPropertyInspector(context, 'testResult', {
            success: false,
            message: 'No API token provided'
        });
        return;
    }
    
    getChannelInfo(settings.apiToken, settings.channelSlug || 'ticklefitz')
        .then(function(channelData) {
            sendToPropertyInspector(context, 'testResult', {
                success: true,
                message: 'Connection successful',
                channelData: channelData
            });
        })
        .catch(function(error) {
            sendToPropertyInspector(context, 'testResult', {
                success: false,
                message: error.message
            });
        });
}

// Utility functions
function setTitle(context, title) {
    if (websocket && websocket.readyState === 1) {
        var json = {
            event: 'setTitle',
            context: context,
            payload: {
                title: title,
                target: 0
            }
        };
        websocket.send(JSON.stringify(json));
        console.log('Title set to:', title);
    }
}

function requestSettings(context) {
    if (websocket && websocket.readyState === 1) {
        var json = {
            event: 'getSettings',
            context: context
        };
        websocket.send(JSON.stringify(json));
    }
}

function saveSettings(context, settings) {
    if (websocket && websocket.readyState === 1) {
        var json = {
            event: 'setSettings',
            context: context,
            payload: settings
        };
        websocket.send(JSON.stringify(json));
    }
}

function sendToPropertyInspector(context, event, data) {
    if (websocket && websocket.readyState === 1) {
        var json = {
            event: 'sendToPropertyInspector',
            context: context,
            payload: {
                event: event,
                data: data
            }
        };
        websocket.send(JSON.stringify(json));
    }
}

function mergeSettings(settings) {
    var merged = {};
    for (var key in defaultSettings) {
        merged[key] = defaultSettings[key];
    }
    if (settings) {
        for (var key in settings) {
            merged[key] = settings[key];
        }
    }
    return merged;
}

console.log('Plugin script loaded successfully');

// Export for Stream Deck
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { connectElgatoStreamDeckSocket: connectElgatoStreamDeckSocket };
}
