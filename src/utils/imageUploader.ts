import { supabase } from '../lib/supabase/client';

// Helper function to sanitize filenames
const sanitizeFilename = (filename: string) =>
    filename.trim()
        .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace non-alphanumeric characters
        .replace(/_{2,}/g, '_')           // Replace multiple underscores with single
        .replace(/^_+|_+$/g, '')          // Remove leading/trailing underscores
        .toLowerCase();                    // Convert to lowercase

// Function to upload all public images to Supabase storage
export const uploadPublicImagesToStorage = async () => {
    const imageFiles = [
        '1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg', '7.jpg',
        'JOLLOF RICE.jpg', 'afang soup.jpg', 'beef.jpg', 'bitter leaf soup.jpg',
        'boiled egg.jpg', 'chicken pepper soup.jpg', 'chicken.jpg',
        'chocolate syrup.jpg', 'cocacola.jpg', 'eba.jpg', 'egusi soup.jpg',
        'ewedu.jpg', 'fanta.jpg', 'fried fish.jpg', 'fried rice.jpg', 'fufu.jpg',
        'image.webp', 'indomie.jpg', 'jollof spag.jpg', 'maple syrup.jpg',
        'moimoi.jpg', 'okro soup.jpg', 'pancakes.jpg', 'plantain.jpg', 'ponmo.jpg',
        'porridge beans.jpg', 'porridge yam.jpg', 'pounded yam.jpg', 'puff puff.jpg',
        'semo.jpg', 'sharwama.jpg', 'sprite.jpg', 'stawberry syrup.jpg',
        'toast bread.jpg', 'vegetable soup.jpg', 'waffles.jpg', 'white rice.jpg',
        'white spag.jpg', 'food-placeholder.png'
    ];

    console.log(`Uploading ${imageFiles.length} images...`);

    for (const filename of imageFiles) {
        const sanitizedFilename = sanitizeFilename(filename);

        // Check if file exists in Supabase storage
        const { data: existingFiles } = await supabase
            .storage
            .from('menu-images')
            .list('', { search: sanitizedFilename });

        if (existingFiles?.length) {
            console.log(`✅ Image "${filename}" already exists, skipping.`);
            continue;
        }

        try {
            // Fetch the original file from public folder
            const response = await fetch(`/images/${filename}`);
            if (!response.ok) {
                console.warn(`⚠️ Could not fetch public image: ${filename}`);
                continue;
            }

            const blob = await response.blob();
            const file = new File([blob], filename, { type: blob.type });

            // Upload to Supabase
            const { error } = await supabase
                .storage
                .from('menu-images')
                .upload(sanitizedFilename, file, { cacheControl: '3600', upsert: false });

            if (error) {
                console.error(`❌ Error uploading "${filename}":`, error);
            } else {
                console.log(`✅ Uploaded "${filename}" successfully.`);
            }
        } catch (err) {
            console.error(`❌ Error processing "${filename}":`, err);
        }
    }

    console.log('✅ All images processed!');
};

// Improved function to get image URL that works with both storage and public folder
export const getImageUrl = async (filename: string): Promise<string> => {
    // Clean the filename to handle special characters
    const cleanFilename = sanitizeFilename(filename);

    // First, try to get the public URL from Supabase storage
    const { data: storageData } = await supabase
        .storage
        .from('menu-images')
        .getPublicUrl(cleanFilename);

    if (storageData?.publicUrl) {
        // Check if the URL is accessible by making a HEAD request
        try {
            const response = await fetch(storageData.publicUrl, { method: 'HEAD' });
            if (response.ok) {
                return storageData.publicUrl;
            }
        } catch (error) {
            console.warn(`Storage URL not accessible, falling back to public:`, error);
        }
    }

    // If not in storage or not accessible, return the public directory URL
    // Try original filename first (in case it has special characters)
    try {
        const originalResponse = await fetch(`/images/${filename}`, { method: 'HEAD' });
        if (originalResponse.ok) {
            return `/images/${filename}`;
        }
    } catch (error) {
        // Continue to fallback
    }

    // Finally, try the sanitized filename in public directory
    const sanitizedResponse = await fetch(`/images/${cleanFilename}`, { method: 'HEAD' });
    if (sanitizedResponse.ok) {
        return `/images/${cleanFilename}`;
    }

    // If all else fails, return the sanitized public URL as fallback
    return `/images/${cleanFilename}`;
};

// Function to upload vendor images with proper sanitization
export const uploadVendorImage = async (file: File, bucket: 'vendor-logos' | 'menu-images' = 'menu-images'): Promise<string | null> => {
    try {
        // Sanitize the filename to remove problematic characters
        const cleanFileName = file.name
            .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace non-alphanumeric characters with underscore
            .replace(/_{2,}/g, '_') // Replace multiple underscores with single
            .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
            .toLowerCase(); // Convert to lowercase

        // Add timestamp prefix to ensure uniqueness
        const timestamp = Date.now();
        const fileName = `${bucket === 'vendor-logos' ? 'store' : 'food'}-${timestamp}-${cleanFileName}`.replace(/\s+/g, '-');

        console.log('Uploading file:', { originalName: file.name, cleanName: cleanFileName, finalName: fileName });

        // First, check if the file already exists and delete it if needed
        try {
            await supabase
                .storage
                .from(bucket)
                .remove([fileName]); // This won't cause an error if the file doesn't exist
        } catch (deleteError) {
            console.warn('Error removing existing file (may not exist):', deleteError);
            // Continue anyway since the file might not exist
        }

        const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from(bucket)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: true // Overwrite if exists
            });

        if (uploadError) {
            console.error('Image upload failed:', uploadError);
            return null;
        }

        // Get public URL
        const { data: publicUrlData } = supabase
            .storage
            .from(bucket)
            .getPublicUrl(fileName);

        const imageUrl = publicUrlData?.publicUrl || '';
        console.log('Uploaded image URL:', imageUrl);

        return imageUrl;
    } catch (error) {
        console.error('Error in uploadVendorImage:', error);
        return null;
    }
};