**# Stream Deck Kick Clip Creator

A Stream Deck plugin that creates 30-second clips on Kick.com and automatically posts the clip URL to chat.

## Features

- ✅ Create clips with customizable duration (15, 30, or 60 seconds)
- ✅ Automatically post clip URLs to chat
- ✅ Visual feedback on Stream Deck button
- ✅ Easy configuration through Property Inspector
- ✅ API connection testing

## Prerequisites

- Stream Deck software (version 6.0+)
- Windows 11 (or Windows 10)
- Kick.com account with API access
- Node.js (for development)

## Installation

### For Development

1. Clone this repository:
```bash
git clone https://github.com/BigChiefRick/streamdeck-kick-clipper.git
cd streamdeck-kick-clipper
```

2. Install dependencies:
```bash
npm install
```

3. Build and install the plugin:
```bash
npm run install-plugin
```

### For Users

1. Download the `.streamDeckPlugin` file from the releases page
2. Double-click to install in Stream Deck software

## Setup

1. **Get Kick API Token:**
   - Go to Kick.com developer settings
   - Generate an API token with clip creation and chat permissions
   - Copy the token

2. **Configure the Plugin:**
   - Drag the "Kick Clip Creator" action to your Stream Deck
   - Right-click and select "Edit Action"
   - Enter your API token
   - Set the channel slug (default: "ticklefitz")
   - Test the connection

3. **Usage:**
   - Press the button to create a clip of the last 30 seconds
   - The clip URL will automatically be posted to chat
   - Button shows status: "Creating...", "Success!", or "Error"

## API Requirements

The plugin requires a Kick API token with the following permissions:
- `clips:create` - To create clips
- `chat:send` - To post messages to chat
- `channels:read` - To access channel information

## Configuration Options

- **API Token**: Your Kick API authentication token
- **Channel Slug**: The channel where clips will be created (e.g., "ticklefitz")
- **Clip Duration**: Length of clip in seconds (15, 30, or 60)
- **Auto-post to Chat**: Whether to automatically post clip URLs to chat

## File Structure

```
streamdeck-kick-clipper/
├── manifest.json              # Plugin manifest
├── app.js                     # Main plugin logic
├── PropertyInspector/
│   ├── index.html            # Configuration UI
│   ├── propertyInspector.js  # Configuration logic
│   └── sdpi.css              # Styles
├── Images/
│   ├── actionIcon.png        # Action icon (28x28)
│   ├── actionDefaultImage.png # Button image (72x72)
│   └── pluginIcon.png        # Plugin icon (28x28)
├── package.json
├── build.js                  # Build script
└── README.md
```

## Development

### Building

```bash
npm run build
```

### Installing to Stream Deck

```bash
npm run install-plugin
```

### Development Workflow

1. Make changes to source files
2. Run `npm run dev` to build and install
3. Restart Stream Deck software to reload plugin

## API Endpoints Used

- `GET /api/v2/channels/{slug}` - Get channel information
- `POST /api/v2/channels/{slug}/clips` - Create clip
- `POST /api/v2/messages/send/{chatroom_id}` - Send chat message

## Troubleshooting

### Common Issues

1. **"No Token" error**: Make sure you've entered a valid API token in the settings
2. **"Failed" error**: Check that the channel is live and streaming
3. **Plugin not appearing**: Restart Stream Deck software after installation

### Debug Logs

Check Stream Deck logs at:
`%APPDATA%\Elgato\StreamDeck\logs\`

### API Rate Limits

Kick API has rate limits. If you get rate limit errors:
- Wait a few minutes between requests
- Consider implementing request queuing for multiple clips

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- GitHub Issues: https://github.com/BigChiefRick/streamdeck-kick-clipper/issues
- Kick Channel: https://kick.com/ticklefitz

## Changelog

### v1.0.0
- Initial release
- Basic clip creation and chat posting
- Property Inspector configuration
- API connection testing**
