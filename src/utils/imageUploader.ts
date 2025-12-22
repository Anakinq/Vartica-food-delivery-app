import { supabase } from '../lib/supabase';

// Function to upload all public images to Supabase storage
export const uploadPublicImagesToStorage = async () => {
    try {
        // List of image filenames in the public/images directory
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

        console.log(`Uploading ${imageFiles.length} images to Supabase storage...`);

        for (const filename of imageFiles) {
            // Check if the image already exists in storage
            const { data } = await supabase
                .storage
                .from('menu-images')
                .getPublicUrl(filename);

            // If the URL exists, the image is already uploaded
            if (data?.publicUrl) {
                console.log(`Image ${filename} already exists in storage`);
                continue;
            }

            // If not, we need to fetch the public image and upload it
            try {
                // Fetch the public image
                const response = await fetch(`/images/${filename}`);
                if (!response.ok) {
                    console.warn(`Could not fetch public image: /images/${filename}`);
                    continue;
                }

                const blob = await response.blob();
                const file = new File([blob], filename, { type: blob.type });

                // Upload to Supabase storage
                const { data: uploadData, error } = await supabase
                    .storage
                    .from('menu-images')
                    .upload(filename, file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (error) {
                    console.error(`Error uploading ${filename}:`, error);
                } else {
                    console.log(`Successfully uploaded ${filename} to storage`);
                }
            } catch (error) {
                console.error(`Error processing public image ${filename}:`, error);
            }
        }

        console.log('Image upload process completed!');
        return { success: true, message: `Processed ${imageFiles.length} images` };
    } catch (error) {
        console.error('Error uploading public images:', error);
        return { success: false, message: 'Failed to upload public images', error };
    }
};

// Function to get a public URL for an image that might be in Supabase storage or public directory
export const getImageUrl = async (filename: string): Promise<string> => {
    // First, try to get the public URL from Supabase storage
    const { data, error } = await supabase
        .storage
        .from('menu-images')
        .getPublicUrl(filename);

    if (!error && data?.publicUrl) {
        return data.publicUrl;
    }

    // If not in storage, return the public directory URL
    return `/images/${filename}`;
};