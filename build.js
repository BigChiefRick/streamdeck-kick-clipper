const fs = require('fs-extra');
const path = require('path');

const PLUGIN_NAME = 'com.bigchiefrick.kickclipper.sdPlugin';
const DIST_DIR = path.join(__dirname, 'dist', PLUGIN_NAME);

async function build() {
    console.log('Building Stream Deck Plugin...');
    
    try {
        // Clean dist directory
        await fs.remove(DIST_DIR);
        await fs.ensureDir(DIST_DIR);
        
        // Copy manifest
        await fs.copy('manifest.json', path.join(DIST_DIR, 'manifest.json'));
        
        // Copy main app file
        await fs.copy('app.js', path.join(DIST_DIR, 'app.js'));
        
        // Copy Property Inspector
        await fs.ensureDir(path.join(DIST_DIR, 'PropertyInspector'));
        await fs.copy('PropertyInspector/', path.join(DIST_DIR, 'PropertyInspector/'));
        
        // Create Images directory and copy placeholder images
        await fs.ensureDir(path.join(DIST_DIR, 'Images'));
        
        // Create placeholder images if they don't exist
        const imagePaths = [
            'Images/actionIcon.png',
            'Images/actionDefaultImage.png',
            'Images/pluginIcon.png'
        ];
        
        for (const imagePath of imagePaths) {
            const fullPath = path.join(DIST_DIR, imagePath);
            if (!await fs.pathExists(fullPath)) {
                // Create a simple placeholder file (you'll need to replace with actual images)
                await fs.writeFile(fullPath, '');
                console.log(`Created placeholder: ${imagePath}`);
            }
        }
        
        // Copy sdpi.css if it exists (Stream Deck default styles)
        const sdpiCssPath = 'PropertyInspector/sdpi.css';
        if (await fs.pathExists(sdpiCssPath)) {
            await fs.copy(sdpiCssPath, path.join(DIST_DIR, 'PropertyInspector/sdpi.css'));
        } else {
            // Create basic styles
            const basicCss = `
.sdpi-wrapper { padding: 20px; font-family: Arial, sans-serif; }
.sdpi-heading { font-size: 18px; font-weight: bold; margin-bottom: 20px; }
.sdpi-item { margin-bottom: 15px; }
.sdpi-item-label { font-weight: bold; margin-bottom: 5px; }
.sdpi-item-value { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
.sdpi-item-help { font-size: 12px; color: #666; margin-top: 3px; }
button { background-color: #007cba; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; }
button:hover { background-color: #005a82; }
button:disabled { background-color: #ccc; cursor: not-allowed; }
            `;
            await fs.writeFile(path.join(DIST_DIR, 'PropertyInspector/sdpi.css'), basicCss);
        }
        
        console.log(`✅ Plugin built successfully in ${DIST_DIR}`);
        console.log('\nNext steps:');
        console.log('1. Add your actual PNG images to the Images/ folder');
        console.log('2. Get a Kick API token from your Kick developer settings');
        console.log('3. Run "npm run install-plugin" to install to Stream Deck');
        
    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

build();
