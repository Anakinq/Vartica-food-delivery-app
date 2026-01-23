import { supabase } from '../lib/supabase/client';
import { parseMenuItems, uploadCafeteriaMenu, getCafeteriaIdByName } from './cafeteriaMenuUploader';

const cafeteriaName = "Cafeteria 2";

// The menu data you provided formatted correctly
const menuText = `Rice_400
Jollof fried rice_400
Porridge white beans_500
White jollof spag_400
Macaroni_400
Beef fish_500
Egg_300
Swallow_500
Soup_300
Ofada sauce_300
Ofada rice_400
Stew_200
Chicken sauce_1000
Fish sauce_600
Chinese Basmati rice_700
Oyster rice_600
Carbonara rice_700
Singapore & stir fry spag_500
White spag_400
Jollof spag_400
Macaroni_400`;

/**
 * Function to upload the Cafeteria 2 menu
 */
export const uploadCafeteria2Menu = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log("Starting upload for Cafeteria 2 menu...");
    
    // First, get the cafeteria ID by name
    const cafeteriaId = await getCafeteriaIdByName(cafeteriaName);
    if (!cafeteriaId) {
      console.error(`Cafeteria with name "${cafeteriaName}" not found in the database.`);
      console.log("Available cafeterias:");
      
      // Show available cafeterias for reference
      const { data: cafeterias, error: cafError } = await supabase
        .from('cafeterias')
        .select('id, name');
        
      if (cafError) {
        console.error("Error fetching cafeterias:", cafError);
        return {
          success: false,
          message: `Cafeteria "${cafeteriaName}" not found and error occurred while retrieving available cafeterias: ${cafError.message}`
        };
      }
      
      if (cafeterias && cafeterias.length > 0) {
        console.log("Available cafeterias:");
        cafeterias.forEach(caf => {
          console.log(`- ID: ${caf.id}, Name: ${caf.name}`);
        });
      } else {
        console.log("No cafeterias found in the database.");
      }
      
      return {
        success: false,
        message: `Cafeteria "${cafeteriaName}" not found in the database. Please check the cafeteria name.`
      };
    }
    
    console.log(`Found cafeteria ID: ${cafeteriaId}`);
    
    // Parse the menu items from the provided text
    const menuItems = parseMenuItems(menuText);
    console.log(`Parsed ${menuItems.length} menu items`);
    
    if (menuItems.length === 0) {
      return {
        success: false,
        message: "No valid menu items were parsed from the provided text."
      };
    }
    
    console.log("Menu items to upload:", menuItems);
    
    // Upload the menu items
    const result = await uploadCafeteriaMenu(cafeteriaId, menuItems);
    
    if (result.success) {
      console.log("Successfully uploaded menu items!");
    } else {
      console.error("Failed to upload menu items:", result.message);
    }
    
    return result;
  } catch (error) {
    console.error("Unexpected error during menu upload:", error);
    return {
      success: false,
      message: `Unexpected error during menu upload: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

// If this file is run directly, execute the upload
if (typeof window !== 'undefined' && window.location && window.location.pathname.includes('uploadCafeteria2Menu')) {
  uploadCafeteria2Menu()
    .then(result => {
      console.log("Upload result:", result);
    })
    .catch(error => {
      console.error("Error running upload:", error);
    });
}

// Export for manual execution
export default uploadCafeteria2Menu;