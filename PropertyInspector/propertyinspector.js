// Property Inspector for Kick Clip Creator1
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
    const apiTokenInput = document.getElementById('apiToken');
    const channelSlugInput = document.getElementById('channelSlug');
    const clipDurationSelect = document.getElementById('clipDuration');
    const autoPostCheckbox = document.getElementById('autoPostToChat');
    
    if (settings.apiToken) {
        apiTokenInput.value = settings.apiToken;
    }
    
    if (settings.channelSlug) {
        channelSlugInput.value = settings.channelSlug;
    }
    
    if (settings.clipDuration) {
        clipDurationSelect.value = settings.clipDuration;
    }
    
    if (settings.autoPostToChat !== undefined) {
        autoPostCheckbox.checked = settings.autoPostToChat;
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
    // API Token input
    const apiTokenInput = document.getElementById('apiToken');
    apiTokenInput.addEventListener('input', function() {
        settings.apiToken = this.value;
        saveSettings();
    });
    
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
    
    // Test connection button
    const testButton = document.getElementById('testConnection');
    testButton.addEventListener('click', testConnection);
});

// Test API connection
async function testConnection() {
    const testResult = document.getElementById('testResult');
    const testButton = document.getElementById('testConnection');
    
    if (!settings.apiToken) {
        testResult.textContent = 'Please enter an API token first';
        testResult.style.color = 'red';
        return;
    }
    
    testButton.disabled = true;
    testButton.textContent = 'Testing...';
    testResult.textContent = '';
    
    try {
        const channelSlug = settings.channelSlug || 'ticklefitz';
        const response = await fetch(`https://kick.com/api/v2/channels/${channelSlug}`, {
            headers: {
                'Authorization': `Bearer ${settings.apiToken}`,
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            testResult.textContent = `✅ Connected successfully to ${data.slug}`;
            testResult.style.color = 'green';
        } else {
            testResult.textContent = `❌ Connection failed: ${response.status}`;
            testResult.style.color = 'red';
        }
    } catch (error) {
        testResult.textContent = `❌ Error: ${error.message}`;
        testResult.style.color = 'red';
    } finally {
        testButton.disabled = false;
        testButton.textContent = 'Test API Connection';
    }
}
