/**
 * Image Optimization Script
 * 
 * This script optimizes images in the public folder by:
 * 1. Converting large PNG/JPG to WebP format
 * 2. Resizing images that are too large
 * 3. Generating responsive sizes for key images
 * 
 * Run with: npm run optimize-images
 * 
 * Note: Requires sharp to be installed (already in devDependencies)
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, 'public');
const IMAGES_DIR = path.join(PUBLIC_DIR, 'images');

// Configuration
const MAX_SIZE = 1920; // Max width/height
const QUALITY = 80; // WebP quality
const LARGE_IMAGE_THRESHOLD = 500000; // 500KB - images larger than this get optimized

// Images that should have multiple sizes generated
const RESPONSIVE_IMAGES = [
    { name: 'logo', widths: [192, 512, 1024] },
    { name: 'icon-192', widths: [192] },
    { name: 'icon-512', widths: [512] },
];

async function optimizeImage(filePath) {
    const stats = fs.statSync(filePath);

    // Skip small images
    if (stats.size < LARGE_IMAGE_THRESHOLD) {
        console.log(`  Skipping ${path.basename(filePath)} (already small: ${(stats.size / 1024).toFixed(1)}KB)`);
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath, ext);
    const dir = path.dirname(filePath);
    const webpPath = path.join(dir, `${basename}.webp`);

    try {
        // Get image metadata
        const metadata = await sharp(filePath).metadata();
        console.log(`  Processing ${path.basename(filePath)} (${metadata.width}x${metadata.height}, ${(stats.size / 1024).toFixed(1)}KB)`);

        // Resize if too large
        let pipeline = sharp(filePath);
        if (metadata.width > MAX_SIZE || metadata.height > MAX_SIZE) {
            pipeline = pipeline.resize(MAX_SIZE, MAX_SIZE, { fit: 'inside', withoutEnlargement: true });
        }

        // Convert to WebP if it's PNG or JPG
        if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
            await pipeline
                .webp({ quality: QUALITY })
                .toFile(webpPath);

            const webpStats = fs.statSync(webpPath);
            const savings = ((stats.size - webpStats.size) / stats.size * 100).toFixed(1);
            console.log(`    ✓ Created ${basename}.webp (${(webpStats.size / 1024).toFixed(1)}KB, ${savings}% smaller)`);
        } else {
            // Just optimize existing format
            await pipeline.toFile(filePath + '.optimized');
            fs.renameSync(filePath + '.optimized', filePath);
            console.log(`    ✓ Optimized ${path.basename(filePath)}`);
        }
    } catch (error) {
        console.error(`  ✗ Error processing ${path.basename(filePath)}:`, error.message);
    }
}

async function generateResponsiveImages() {
    console.log('\n📏 Generating responsive image sizes...');

    for (const config of RESPONSIVE_IMAGES) {
        const sourcePath = path.join(PUBLIC_DIR, `${config.name}.png`);
        const sourcePathJpg = path.join(PUBLIC_DIR, `${config.name}.jpg`);

        let sourceFile = null;
        if (fs.existsSync(sourcePath)) {
            sourceFile = sourcePath;
        } else if (fs.existsSync(sourcePathJpg)) {
            sourceFile = sourcePathJpg;
        }

        if (!sourceFile) {
            console.log(`  Source not found for ${config.name}, skipping responsive generation`);
            continue;
        }

        for (const width of config.widths) {
            const outputPath = path.join(PUBLIC_DIR, `${config.name}-${width}.png`);
            if (!fs.existsSync(outputPath)) {
                try {
                    await sharp(sourceFile)
                        .resize(width, width, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                        .png()
                        .toFile(outputPath);
                    console.log(`  ✓ Created ${config.name}-${width}.png`);
                } catch (error) {
                    console.error(`  ✗ Error creating ${config.name}-${width}.png:`, error.message);
                }
            }
        }
    }
}

async function optimizeDirectory(dirPath) {
    console.log(`\n📁 Scanning ${path.relative(PUBLIC_DIR, dirPath)}...`);

    const files = fs.readdirSync(dirPath);

    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            await optimizeDirectory(filePath);
        } else {
            const ext = path.extname(file).toLowerCase();
            if (['.png', '.jpg', '.jpeg'].includes(ext)) {
                await optimizeImage(filePath);
            }
        }
    }
}

async function main() {
    console.log('🖼️  Vartica Image Optimization Script');
    console.log('=====================================\n');

    // Check if sharp is available
    try {
        require('sharp');
    } catch (error) {
        console.error('❌ Error: sharp is not installed.');
        console.error('   Run: npm install sharp');
        process.exit(1);
    }

    // Optimize main public folder
    await optimizeDirectory(PUBLIC_DIR);

    // Generate responsive images
    await generateResponsiveImages();

    console.log('\n✅ Image optimization complete!');
    console.log('\nTip: Add the following to your build process for automatic optimization:');
    console.log('  npm run build');
}

main().catch(console.error);
