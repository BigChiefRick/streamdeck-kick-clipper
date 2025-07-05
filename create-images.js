const fs = require('fs');
const path = require('path');

// Simple 1x1 transparent PNG - this is a valid minimal PNG file
const transparentPNG = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // Width: 1
    0x00, 0x00, 0x00, 0x01, // Height: 1
    0x08, 0x06, 0x00, 0x00, 0x00, // Bit depth, color type, compression, filter, interlace
    0x1F, 0x15, 0xC4, 0x89, // IHDR CRC
    0x00, 0x00, 0x00, 0x0A, // IDAT length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, // Compressed data
    0x0D, 0x0A, 0x2D, 0xB4, // IDAT CRC
    0x00, 0x00, 0x00, 0x00, // IEND length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // IEND CRC
]);

// Create Images directory if it doesn't exist
const imagesDir = path.join(__dirname, 'Images');
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
}

// Create the image files
const imageFiles = [
    'actionIcon.png',        // 28x28 - Action icon in Stream Deck
    'actionDefaultImage.png', // 72x72 - Default button image
    'pluginIcon.png'         // 28x28 - Plugin icon in marketplace
];

console.log('Creating proper PNG image files...');

imageFiles.forEach(filename => {
    const filePath = path.join(imagesDir, filename);
    try {
        fs.writeFileSync(filePath, transparentPNG);
        console.log(`✅ Created ${filename} (${transparentPNG.length} bytes)`);
    } catch (error) {
        console.error(`❌ Failed to create ${filename}:`, error.message);
    }
});

console.log('\n🎉 PNG files created successfully!');
console.log('📝 Note: These are minimal 1x1 transparent PNGs.');
console.log('💡 For better visuals, replace with proper 28x28 and 72x72 images later.');

// Create a simple validation script
const validationScript = `
// Validate PNG files
const fs = require('fs');
const path = require('path');

const files = ['actionIcon.png', 'actionDefaultImage.png', 'pluginIcon.png'];
const imagesDir = path.join(__dirname, 'Images');

console.log('Validating PNG files...');
files.forEach(file => {
    const filePath = path.join(imagesDir, file);
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const data = fs.readFileSync(filePath);
        const isPNG = data.length > 8 && 
                     data[0] === 0x89 && 
                     data[1] === 0x50 && 
                     data[2] === 0x4E && 
                     data[3] === 0x47;
        console.log(\`\${file}: \${isPNG ? '✅ Valid PNG' : '❌ Invalid'} (\${stats.size} bytes)\`);
    } else {
        console.log(\`\${file}: ❌ Missing\`);
    }
});
`;

fs.writeFileSync(path.join(__dirname, 'validate-images.js'), validationScript);
console.log('📄 Created validate-images.js for testing');
