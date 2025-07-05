// Stream Deck Plugin for Kick Clip Creation
// Author: BigChiefRick

let websocket = null;
let uuid = null;

// Kick API configuration
const KICK_API_BASE = 'https://kick.com/api/v2';
const CHANNEL_NAME = 'ticklefitz';

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
        setTitle(context, 'Creating...');
        
        // Get settings
        const settings = payload.settings || {};
        const apiToken = settings.apiToken;
        const channelSlug = settings.channelSlug || CHANNEL_NAME;
        
        if (!apiToken) {
            setTitle(context, 'No Token');
            setTimeout(() => setTitle(context, 'Kick Clip'), 2000);
            return;
        }
        
        // Create clip
        const clipData = await createKickClip(apiToken, channelSlug);
        
        if (clipData && clipData.clip_url) {
            // Post clip URL to chat
            await postClipToChat(apiToken, channelSlug, clipData.clip_url);
            setTitle(context, 'Success!');
            setTimeout(() => setTitle(context, 'Kick Clip'), 2000);
        } else {
            setTitle(context, 'Failed');
            setTimeout(() => setTitle(context, 'Kick Clip'), 2000);
        }
        
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

// Create clip on Kick
async function createKickClip(apiToken, channelSlug) {
    try {
        const response = await fetch(`${KICK_API_BASE}/channels/${channelSlug}/clips`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                duration: 30, // 30 seconds
                title: `Clip from ${new Date().toLocaleString()}`
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
        
    } catch (error) {
        console.error('Error creating clip:', error);
        throw error;
    }
}

// Post clip URL to chat
async function postClipToChat(apiToken, channelSlug, clipUrl) {
    try {
        // First, get channel info to get the chatroom ID
        const channelResponse = await fetch(`${KICK_API_BASE}/channels/${channelSlug}`, {
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Accept': 'application/json'
            }
        });
        
        if (!channelResponse.ok) {
            throw new Error(`Failed to get channel info: ${channelResponse.status}`);
        }
        
        const channelData = await channelResponse.json();
        const chatroomId = channelData.chatroom?.id;
        
        if (!chatroomId) {
            throw new Error('Could not find chatroom ID');
        }
        
        // Post message to chat
        const chatResponse = await fetch(`${KICK_API_BASE}/messages/send/${chatroomId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                content: `🎬 New clip created: ${clipUrl}`,
                type: 'message'
            })
        });
        
        if (!chatResponse.ok) {
            throw new Error(`Failed to post to chat: ${chatResponse.status}`);
        }
        
        return await chatResponse.json();
        
    } catch (error) {
        console.error('Error posting to chat:', error);
        throw error;
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
