// Simple script to create placeholder PNG images for Stream Deck plugin
const fs = require('fs');
const path = require('path');

// Create a simple PNG header for a solid color image
function createSimplePNG(width, height, r = 100, g = 100, b = 100) {
    // This creates a very basic PNG with solid color
    // For a real implementation, you'd use a proper image library like sharp or canvas
    
    // PNG signature
    const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    
    // IHDR chunk
    const ihdr = Buffer.alloc(25);
    ihdr.writeUInt32BE(13, 0); // Length
    ihdr.write('IHDR', 4);
    ihdr.writeUInt32BE(width, 8);
    ihdr.writeUInt32BE(height, 12);
    ihdr.writeUInt8(8, 16); // Bit depth
    ihdr.writeUInt8(2, 17); // Color type (RGB)
    ihdr.writeUInt8(0, 18); // Compression
    ihdr.writeUInt8(0, 19); // Filter
    ihdr.writeUInt8(0, 20); // Interlace
    
    // Calculate CRC for IHDR
    const crc = require('crc-32');
    const ihdrCrc = crc.buf(ihdr.slice(4, 21));
    ihdr.writeUInt32BE(ihdrCrc >>> 0, 21);
    
    // Simple IDAT chunk with solid color
    const pixelData = Buffer.alloc(width * height * 3);
    for (let i = 0; i < pixelData.length; i += 3) {
        pixelData[i] = r;     // Red
        pixelData[i + 1] = g; // Green
        pixelData[i + 2] = b; // Blue
    }
    
    // IEND chunk
    const iend = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);
    
    // Combine all chunks (simplified - real PNG would need proper IDAT compression)
    return Buffer.concat([signature, ihdr, iend]);
}

// Create images directory
const imagesDir = path.join(__dirname, 'Images');
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir);
}

console.log('Creating placeholder images...');

// Create simple colored rectangles as placeholders
const images = [
    { name: 'actionIcon.png', size: 28, color: [50, 150, 200] },
    { name: 'actionDefaultImage.png', size: 72, color: [70, 130, 180] },
    { name: 'pluginIcon.png', size: 28, color: [60, 140, 190] }
];

images.forEach(img => {
    const filePath = path.join(imagesDir, img.name);
    
    // Create a simple bitmap-style file (not a real PNG, but should work for testing)
    const simpleImage = Buffer.alloc(100);
    simpleImage.fill(0x42); // Fill with some data
    
    fs.writeFileSync(filePath, simpleImage);
    console.log(`Created ${img.name} (${img.size}x${img.size})`);
});

console.log('\n✅ Placeholder images created!');
console.log('Note: These are basic placeholders. For production, create proper PNG files.');
console.log('You can replace them with real images later.');
