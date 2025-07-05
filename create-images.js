const fs = require('fs');
const path = require('path');

// Minimal PNG file data (1x1 pixel transparent PNG)
const minimalPNG = Buffer.from([
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
    fs.mkdirSync(imagesDir);
}

// Create the image files
const imageFiles = [
    'actionIcon.png',
    'actionDefaultImage.png', 
    'pluginIcon.png'
];

console.log('Creating real PNG files...');

imageFiles.forEach(filename => {
    const filePath = path.join(imagesDir, filename);
    fs.writeFileSync(filePath, minimalPNG);
    console.log(`✅ Created ${filename} (${minimalPNG.length} bytes)`);
});

console.log('\n🎉 Real PNG files created successfully!');
console.log('Now rebuild and test the plugin.');
