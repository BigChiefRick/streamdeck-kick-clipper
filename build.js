const fs = require('fs-extra');
const path = require('path');

const PLUGIN_NAME = 'com.bigchiefrick.kickclipper.sdPlugin';
const DIST_DIR = path.join(__dirname, 'dist', PLUGIN_NAME);

async function build() {
    console.log('🔨 Building Stream Deck Plugin...');
    
    try {
        // Clean dist directory
        await fs.remove(DIST_DIR);
        await fs.ensureDir(DIST_DIR);
        console.log('🧹 Cleaned dist directory');
        
        // Copy manifest
        await fs.copy('manifest.json', path.join(DIST_DIR, 'manifest.json'));
        console.log('📄 Copied manifest.json');
        
        // Copy main app file
        await fs.copy('app.js', path.join(DIST_DIR, 'app.js'));
        console.log('📄 Copied app.js');
        
        // Copy Property Inspector
        await fs.ensureDir(path.join(DIST_DIR, 'PropertyInspector'));
        await fs.copy('PropertyInspector/', path.join(DIST_DIR, 'PropertyInspector/'));
        console.log('📁 Copied PropertyInspector');
        
        // Create Images directory
        await fs.ensureDir(path.join(DIST_DIR, 'Images'));
        
        // Check if images exist, if not create them
        const imagePaths = [
            'Images/actionIcon.png',
            'Images/actionDefaultImage.png', 
            'Images/pluginIcon.png'
        ];
        
        let imagesExist = true;
        for (const imagePath of imagePaths) {
            if (!await fs.pathExists(imagePath)) {
                imagesExist = false;
                break;
            }
        }
        
        if (!imagesExist) {
            console.log('🖼️  Creating placeholder images...');
            await createImages();
        }
        
        // Copy images
        await fs.copy('Images/', path.join(DIST_DIR, 'Images/'));
        console.log('🖼️  Copied images');
        
        // Validate the build
        await validateBuild();
        
        console.log('\n✅ Plugin built successfully!');
        console.log(`📦 Output: ${DIST_DIR}`);
        console.log('\n📋 Next steps:');
        console.log('1. Run "npm run install-plugin" to install to Stream Deck');
        console.log('2. Restart Stream Deck software');
        console.log('3. Get your Kick API token from https://kick.com/dashboard/settings/api');
        console.log('4. Configure the plugin in Stream Deck');
        
    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

async function createImages() {
    // Simple 1x1 transparent PNG
    const transparentPNG = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01,
        0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00,
        0x1F, 0x15, 0xC4, 0x89,
        0x00, 0x00, 0x00, 0x0A,
        0x49, 0x44, 0x41, 0x54,
        0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01,
        0x0D, 0x0A, 0x2D, 0xB4,
        0x00, 0x00, 0x00, 0x00,
        0x49, 0x45, 0x4E, 0x44,
        0xAE, 0x42, 0x60, 0x82
    ]);
    
    const imagesDir = path.join(__dirname, 'Images');
    await fs.ensureDir(imagesDir);
    
    const imageFiles = [
        'actionIcon.png',
        'actionDefaultImage.png',
        'pluginIcon.png'
    ];
    
    for (const filename of imageFiles) {
        const filePath = path.join(imagesDir, filename);
        await fs.writeFile(filePath, transparentPNG);
        console.log(`   Created ${filename}`);
    }
}

async function validateBuild() {
    console.log('\n🔍 Validating build...');
    
    // Check required files
    const requiredFiles = [
        'manifest.json',
        'app.js',
        'Images/actionIcon.png',
        'Images/actionDefaultImage.png',
        'Images/pluginIcon.png',
        'PropertyInspector/index.html',
        'PropertyInspector/sdpi.css'
    ];
    
    for (const file of requiredFiles) {
        const filePath = path.join(DIST_DIR, file);
        if (await fs.pathExists(filePath)) {
            const stats = await fs.stat(filePath);
            console.log(`   ✅ ${file} (${stats.size} bytes)`);
        } else {
            console.log(`   ❌ ${file} - MISSING`);
            throw new Error(`Required file missing: ${file}`);
        }
    }
    
    // Validate manifest.json
    try {
        const manifestPath = path.join(DIST_DIR, 'manifest.json');
        const manifest = await fs.readJson(manifestPath);
        
        if (!manifest.Actions || !Array.isArray(manifest.Actions) || manifest.Actions.length === 0) {
            throw new Error('Invalid manifest: no Actions defined');
        }
        
        if (!manifest.CodePath) {
            throw new Error('Invalid manifest: no CodePath defined');
        }
        
        console.log(`   ✅ Manifest valid - ${manifest.Actions.length} actions`);
        
    } catch (error) {
        throw new Error(`Manifest validation failed: ${error.message}`);
    }
    
    // Validate images are real PNGs
    const imageFiles = ['actionIcon.png', 'actionDefaultImage.png', 'pluginIcon.png'];
    for (const imageFile of imageFiles) {
        const imagePath = path.join(DIST_DIR, 'Images', imageFile);
        const data = await fs.readFile(imagePath);
        
        // Check PNG signature
        if (data.length >= 8 && 
            data[0] === 0x89 && data[1] === 0x50 && 
            data[2] === 0x4E && data[3] === 0x47) {
            console.log(`   ✅ ${imageFile} is valid PNG`);
        } else {
            throw new Error(`Invalid PNG file: ${imageFile}`);
        }
    }
    
    console.log('🎉 Build validation passed!');
}

// Run if this script is executed directly
if (require.main === module) {
    build();
}

module.exports = { build, createImages, validateBuild };
