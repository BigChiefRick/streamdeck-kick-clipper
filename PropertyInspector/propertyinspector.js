// Property Inspector for Kick Clip Creator
let websocket = null;
let uuid = null;
let actionInfo = null;
let settings = {};

// Connect to Stream Deck
function connectElgatoStreamDeckSocket(inPort, inUUID, inRegisterEvent, inInfo, inActionInfo) {
    uuid = inUUID;
    actionInfo = JSON.parse(inActionInfo);
    
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
        
        if (jsonObj.event === 'didReceiveSettings') {
            settings = jsonObj.payload.settings;
            updateUI();
        }
    };
    
    // Request current settings
    requestSettings();
}

// Request settings from plugin
function requestSettings() {
    if (websocket && websocket.readyState === 1) {
        const json = {
            event: 'getSettings',
            context: uuid
        };
        websocket.send(JSON.stringify(json));
    }
}

// Update UI with current settings
function updateUI() {
    const channelSlugInput = document.getElementById('channelSlug');
    const clipDurationSelect = document.getElementById('clipDuration');
    const autoPostCheckbox = document.getElementById('autoPostToChat');
    const authStatus = document.getElementById('authStatus');
    const authenticateButton = document.getElementById('authenticateButton');
    
    if (settings.channelSlug) {
        channelSlugInput.value = settings.channelSlug;
    }
    
    if (settings.clipDuration) {
        clipDurationSelect.value = settings.clipDuration;
    }
    
    if (settings.autoPostToChat !== undefined) {
        autoPostCheckbox.checked = settings.autoPostToChat;
    }
    
    // Update authentication status
    if (settings.accessToken) {
        authStatus.textContent = '✅ Connected to Kick';
        authStatus.style.color = 'green';
        authenticateButton.textContent = 'Reconnect to Kick';
    } else {
        authStatus.textContent = '❌ Not connected';
        authStatus.style.color = 'red';
        authenticateButton.textContent = 'Connect to Kick';
    }
}

// Save settings to plugin
function saveSettings() {
    if (websocket && websocket.readyState === 1) {
        const json = {
            event: 'setSettings',
            context: uuid,
            payload: settings
        };
        websocket.send(JSON.stringify(json));
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Channel Slug input
    const channelSlugInput = document.getElementById('channelSlug');
    channelSlugInput.addEventListener('input', function() {
        settings.channelSlug = this.value;
        saveSettings();
    });
    
    // Clip Duration select
    const clipDurationSelect = document.getElementById('clipDuration');
    clipDurationSelect.addEventListener('change', function() {
        settings.clipDuration = parseInt(this.value);
        saveSettings();
    });
    
    // Auto-post checkbox
    const autoPostCheckbox = document.getElementById('autoPostToChat');
    autoPostCheckbox.addEventListener('change', function() {
        settings.autoPostToChat = this.checked;
        saveSettings();
    });
    
    // Authentication button
    const authenticateButton = document.getElementById('authenticateButton');
    authenticateButton.addEventListener('click', startAuthentication);
    
    // Test connection button
    const testButton = document.getElementById('testConnection');
    testButton.addEventListener('click', testAuthentication);
});

// Start OAuth authentication process
async function startAuthentication() {
    const authStatus = document.getElementById('authStatus');
    const authenticateButton = document.getElementById('authenticateButton');
    
    try {
        authenticateButton.disabled = true;
        authenticateButton.textContent = 'Starting...';
        authStatus.textContent = 'Opening browser for authentication...';
        authStatus.style.color = 'blue';
        
        // Generate OAuth URL
        const authURL = generateAuthURL();
        
        // Open browser for authentication
        window.open(authURL, '_blank');
        
        authStatus.textContent = 'Complete authentication in browser, then click "Test Authentication"';
        authStatus.style.color = 'orange';
        
    } catch (error) {
        authStatus.textContent = `❌ Error: ${error.message}`;
        authStatus.style.color = 'red';
    } finally {
        authenticateButton.disabled = false;
        authenticateButton.textContent = 'Connect to Kick';
    }
}

// Test authentication
async function testAuthentication() {
    const testResult = document.getElementById('testResult');
    const testButton = document.getElementById('testConnection');
    
    if (!settings.accessToken) {
        testResult.textContent = 'Please authenticate with Kick first';
        testResult.style.color = 'red';
        return;
    }
    
    testButton.disabled = true;
    testButton.textContent = 'Testing...';
    testResult.textContent = '';
    
    try {
        const response = await fetch('https://kick.com/api/public/v1/users', {
            headers: {
                'Authorization': `Bearer ${settings.accessToken}`,
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            testResult.textContent = `✅ Authentication successful`;
            testResult.style.color = 'green';
        } else {
            testResult.textContent = `❌ Authentication failed: ${response.status}`;
            testResult.style.color = 'red';
        }
    } catch (error) {
        testResult.textContent = `❌ Error: ${error.message}`;
        testResult.style.color = 'red';
    } finally {
        testButton.disabled = false;
        testButton.textContent = 'Test Authentication';
    }
}

// OAuth helper functions (simplified versions)
function generateAuthURL() {
    const CLIENT_ID = '01JZE5QW8R70MSNX3R221D52P3';
    const REDIRECT_URI = 'http://127.0.0.1:8080/callback';
    const KICK_OAUTH_BASE = 'https://id.kick.com/oauth';
    
    // Generate state for security
    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('oauth_state', state);
    
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        scope: 'user:read channel:read chat:send',
        state: state
    });
    
    return `${KICK_OAUTH_BASE}/authorize?${params.toString()}`;
}
