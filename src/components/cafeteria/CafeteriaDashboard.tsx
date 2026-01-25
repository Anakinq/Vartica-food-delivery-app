import React, { useEffect, useState } from 'react';
import { LogOut, Plus, Edit2, ToggleLeft, ToggleRight, Upload, Menu, X, User, Camera, Save, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { MenuItem, Cafeteria, Profile } from '../../lib/supabase';
import { supabase } from '../../lib/supabase/client';
import { MenuItemForm } from '../shared/MenuItemForm';
import { seedCafeteriaMenu } from '../../utils/cafeteriaMenuSeeder';
import { withAuth, withStorageAuth } from '../../utils/authWrapper';

interface CafeteriaDashboardProps {
  onShowProfile?: () => void;
}

export const CafeteriaDashboard: React.FC<CafeteriaDashboardProps> = ({ onShowProfile }) => {
  const { profile, signOut, checkApprovalStatus } = useAuth();
  const [approvalStatus, setApprovalStatus] = useState<boolean | null>(null);
  const [loadingApproval, setLoadingApproval] = useState(true);
  const [cafeteria, setCafeteria] = useState<Cafeteria | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [seedingMenu, setSeedingMenu] = useState(false);
  const [clearingMenu, setClearingMenu] = useState(false);
  const [isCafeteriaOpen, setIsCafeteriaOpen] = useState<boolean>(true); // Added for open/close status
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>('');
  const [profileFormData, setProfileFormData] = useState({
    name: '',
    description: '',
  });

  // Enhanced authentication wrapper with better error handling
  const withAuth = async <T,>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T | null> => {
    try {
      // Check current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (!session || sessionError) {
        console.log(`${operationName}: No valid session found, attempting to refresh...`);

        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError || !refreshedSession) {
          console.error(`${operationName}: Session refresh failed`, refreshError);
          signOut();
          return null;
        }

        console.log(`${operationName}: Session refreshed successfully`);
      }

      // Execute the operation
      const result = await operation();
      return result;
    } catch (error) {
      console.error(`${operationName}: Operation failed`, error);

      // Check if it's an authentication error
      if (error instanceof Error &&
        (error.message.includes('401') ||
          error.message.includes('403') ||
          error.message.toLowerCase().includes('auth') ||
          error.message.toLowerCase().includes('permission') ||
          error.message.toLowerCase().includes('unauthorized'))) {
        console.error(`${operationName}: Authentication error detected, signing out`);
        signOut();
        return null;
      }

      throw error;
    }
  };

  // Define uploadImage function inside the component to access profile prop
  const uploadImage = async (file: File): Promise<string | null> => {
    return withStorageAuth(async () => {
      console.log('Uploading file:', file.name);

      // Sanitize the filename to remove problematic characters
      const cleanFileName = file.name
        .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace non-alphanumeric characters with underscore
        .replace(/_{2,}/g, '_') // Replace multiple underscores with single
        .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
        .toLowerCase(); // Convert to lowercase

      // Create a unique filename with user ID to comply with storage policy
      const fileName = `${profile?.id || 'anonymous'}/${Date.now()}-${cleanFileName}`;

      const { data, error } = await supabase.storage
        .from('menu-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true // Allow overwriting
        });

      if (error) {
        console.error('Upload error:', error);
        // Check if it's an authentication/storage error
        if (error.message.toLowerCase().includes('auth') ||
          error.message.toLowerCase().includes('permission') ||
          error.message.toLowerCase().includes('unauthorized') ||
          error.message.includes('401') || error.message.includes('403')) {
          console.error('Authentication failed during upload:', error.message);
          return null;
        }
        // More specific error handling
        console.error('Upload failed:', error.message);
        return null;
      }

      console.log('Upload successful:', data);

      const { data: publicUrlData } = supabase.storage
        .from('menu-images')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData?.publicUrl || '';
      console.log('Public URL:', publicUrl);
      return publicUrl;
    }, 'uploadImage');
  };

  useEffect(() => {
    fetchData();

    // Check approval status for vendors
    if (profile && profile.role === 'vendor') {
      checkVendorApproval();
    }

    // Add event listener for auth errors
    const handleAuthError = () => {
      signOut();
    };

    window.addEventListener('authError', handleAuthError);

    // Cleanup event listener
    return () => {
      window.removeEventListener('authError', handleAuthError);
    };
  }, [profile, signOut]);

  const checkVendorApproval = async () => {
    if (profile && profile.role === 'vendor') {
      setLoadingApproval(true);
      const status = await checkApprovalStatus(profile.id, 'vendor');
      setApprovalStatus(status);
      setLoadingApproval(false);
    }
  };

  // Update the open status when cafeteria data is loaded
  useEffect(() => {
    if (cafeteria) {
      try {
        // Use the same SafeStorage instance that Supabase uses
        const safeStorage = (supabase.auth as any)._client.storage;
        const savedStatus = safeStorage.getItem(`cafeteria-open-${cafeteria.id}`);
        if (savedStatus !== null) {
          setIsCafeteriaOpen(JSON.parse(savedStatus));
        }
      } catch (error) {
        console.warn('Storage access blocked by tracking prevention:', error);
        // Fallback to default status if storage access is blocked
        setIsCafeteriaOpen(true);
      }
      // Update profile form data when cafeteria data is loaded
      setProfileFormData({
        name: cafeteria.name,
        description: cafeteria.description || '',
      });
      setProfileImagePreview(cafeteria.image_url || '');
    }
  }, [cafeteria]);

  const fetchData = async () => {
    if (!profile) return;

    return withAuth(async () => {
      const { data: cafeteriaData } = await supabase
        .from('cafeterias')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (cafeteriaData) {
        setCafeteria(cafeteriaData);

        const { data: items } = await supabase
          .from('menu_items')
          .select('*')
          .eq('seller_id', cafeteriaData.id)
          .eq('seller_type', 'cafeteria')
          .order('name');

        if (items) setMenuItems(items);
      }

      setLoading(false);
    }, 'fetchData');
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    return withAuth(async () => {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !item.is_available })
        .eq('id', item.id);

      if (!error) {
        setMenuItems(menuItems.map(i => i.id === item.id ? { ...i, is_available: !i.is_available } : i));
      } else {
        console.error('Error toggling availability:', error);
      }
    }, 'handleToggleAvailability');
  };

  const handleSaveItem = async (itemData: Partial<MenuItem>, file?: File) => {
    if (!cafeteria) {
      console.error('No cafeteria found');
      // Silently return without alert
      return;
    }

    const result = await withAuth(async () => {
      let finalData = { ...itemData };

      if (file) {
        const imageUrl = await uploadImage(file);
        if (imageUrl) {
          finalData = { ...finalData, image_url: imageUrl };
        } else {
          // Handle upload failure
          console.error('Failed to upload image');
          return false; // Return false to indicate failure
        }
      }

      if (editingItem) {
        const { error: menuItemError } = await supabase
          .from('menu_items')
          .update(finalData)
          .eq('id', editingItem.id);

        if (menuItemError) {
          console.error('Error updating menu item:', menuItemError);
          return false; // Return false to indicate failure
        } else {
          await fetchData();
          setShowForm(false);
          setEditingItem(null);
        }
      } else {
        const { error: insertError } = await supabase
          .from('menu_items')
          .insert({
            ...finalData,
            seller_id: cafeteria.id,
            seller_type: 'cafeteria',
          });

        if (insertError) {
          console.error('Error inserting menu item:', insertError);
          return false; // Return false to indicate failure
        } else {
          await fetchData();
          setShowForm(false);
        }
      }
      return true; // Return true to indicate success
    }, 'handleSaveItem');

    if (result === null) {
      // Authentication error occurred and user was signed out
      return; // Just return without further action
    }
    // Otherwise, operation completed successfully or failed with error logging
  };

  const handleSeedMenu = async () => {
    if (!cafeteria) return;

    setSeedingMenu(true);
    try {
      console.log('Starting seed menu operation...');
      console.log('Cafeteria ID:', cafeteria.id);

      // Check current session and refresh if needed before seeding
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

      if (!currentSession || sessionError) {
        console.log('No valid session found for seed operation, attempting to refresh...');
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError || !refreshedSession) {
          console.error('Session refresh failed during seed operation:', refreshError);
          console.error('Authentication failed during menu seed operation');
          signOut();
          return;
        }

        console.log('Session refreshed successfully for seed operation');
      }

      const result = await seedCafeteriaMenu(cafeteria.id);
      if (result.success) {
        await fetchData(); // Refresh the menu items
        console.log(result.message);
      } else {
        console.error('Error seeding menu: ' + result.message);
        // Check if it's an authentication error
        if (result.message.includes('401') || result.message.includes('403') ||
          result.message.toLowerCase().includes('auth') ||
          result.message.toLowerCase().includes('permission') ||
          result.message.toLowerCase().includes('unauthorized')) {
          console.error('Authentication error detected during seed operation');
          signOut();
        }
      }
    } catch (error) {
      console.error('Error seeding menu:', error);
      console.error('Error seeding menu: ' + (error as Error).message);
      // Check if it's an authentication error
      if ((error as Error).message.includes('401') || (error as Error).message.includes('403') ||
        (error as Error).message.toLowerCase().includes('auth') ||
        (error as Error).message.toLowerCase().includes('permission') ||
        (error as Error).message.toLowerCase().includes('unauthorized')) {
        console.error('Authentication error caught in seed operation');
        signOut();
      }
    } finally {
      setSeedingMenu(false);
    }
  };

  // Bulk upload function for menu items
  const handleBulkUploadMenu = async (menuItems: { name: string; price: number; category?: string; image_url?: string }[]) => {
    if (!cafeteria) return;

    try {
      console.log('Starting bulk upload for Cafeteria 2 menu...');
      console.log('Cafeteria ID:', cafeteria.id);
      console.log('Menu items to upload:', menuItems.length);

      // Check current session and refresh if needed
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

      if (!currentSession || sessionError) {
        console.log('No valid session found, attempting to refresh...');
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError || !refreshedSession) {
          console.error('Session refresh failed during bulk upload:', refreshError);
          return { success: false, message: 'Authentication failed. Please sign in again.' };
        }

        console.log('Session refreshed successfully for bulk upload');
      }

      // Prepare items with seller info
      const itemsToInsert = menuItems.map(item => ({
        ...item,
        seller_id: cafeteria.id,
        seller_type: 'cafeteria' as const,
        is_available: true,
      }));

      console.log('Attempting to insert', itemsToInsert.length, 'menu items');

      // Insert all items at once with retry logic
      let retryCount = 3;
      let lastError: any = null;

      while (retryCount > 0) {
        try {
          const { error } = await supabase
            .from('menu_items')
            .insert(itemsToInsert);

          if (!error) {
            console.log('Menu items uploaded successfully!');
            await fetchData(); // Refresh the menu items
            return { success: true, message: `${itemsToInsert.length} menu items uploaded successfully!` };
          }

          lastError = error;
          console.error(`Upload attempt failed (retry ${4 - retryCount}/3):`, error.message);

          // Check if it's an authentication error
          if (error.message.includes('401') || error.message.includes('403') ||
            error.message.toLowerCase().includes('auth') ||
            error.message.toLowerCase().includes('permission') ||
            error.message.toLowerCase().includes('unauthorized')) {

            if (retryCount > 1) {
              console.log('Authentication error detected, refreshing session and retrying...');
              const { error: refreshError } = await supabase.auth.refreshSession();
              if (refreshError) {
                console.error('Session refresh failed:', refreshError);
                signOut();
                return { success: false, message: 'Authentication failed. Please sign in again.' };
              }
              console.log('Session refreshed, retrying upload...');
            } else {
              console.error('Final retry failed with authentication error');
              signOut();
              return { success: false, message: 'Authentication failed. Please sign in again.' };
            }
          } else {
            // Non-authentication error, don't retry
            console.error('Non-authentication error occurred:', error.message);
            return { success: false, message: `Failed to upload menu items: ${error.message}` };
          }
        } catch (insertError) {
          lastError = insertError;
          console.error(`Exception during upload attempt ${4 - retryCount}:`, insertError);
        }

        retryCount--;
        if (retryCount > 0) {
          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.error('All retry attempts failed. Last error:', lastError?.message || lastError);
      return { success: false, message: `Failed to upload menu items after all retries: ${lastError?.message || 'Unknown error'}` };
    } catch (error) {
      console.error('Unexpected error during bulk upload:', error);
      return { success: false, message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}` };
    }
  };

  const handleClearMenu = async () => {
    if (!cafeteria) return;

    const confirmClear = window.confirm('Are you sure you want to clear all menu items? This cannot be undone.');
    if (!confirmClear) return;

    setClearingMenu(true);
    try {
      console.log('Starting menu clear operation...');
      console.log('Cafeteria ID:', cafeteria.id);

      // Check current session and refresh if needed
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

      if (!currentSession || sessionError) {
        console.log('No valid session found for clear operation, attempting to refresh...');
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError || !refreshedSession) {
          console.error('Session refresh failed during clear operation:', refreshError);
          console.error('Authentication failed during menu clear operation');
          signOut();
          return;
        }

        console.log('Session refreshed successfully for clear operation');
      }

      // Attempt to clear menu with retry logic
      let retryCount = 3;
      let lastError: any = null;

      while (retryCount > 0) {
        try {
          const { error } = await supabase
            .from('menu_items')
            .delete()
            .eq('seller_id', cafeteria.id)
            .eq('seller_type', 'cafeteria');

          if (!error) {
            console.log('Menu cleared successfully!');
            await fetchData(); // Refresh the menu items
            return;
          }

          lastError = error;
          console.error(`Clear attempt failed (retry ${4 - retryCount}/3):`, error.message);

          // Check if it's an authentication error
          if (error.message.includes('401') || error.message.includes('403') ||
            error.message.toLowerCase().includes('auth') ||
            error.message.toLowerCase().includes('permission') ||
            error.message.toLowerCase().includes('unauthorized')) {

            if (retryCount > 1) {
              console.log('Authentication error detected during clear, refreshing session and retrying...');
              const { error: refreshError } = await supabase.auth.refreshSession();
              if (refreshError) {
                console.error('Session refresh failed during clear:', refreshError);
                signOut();
                return;
              }
              console.log('Session refreshed, retrying clear operation...');
            } else {
              console.error('Final retry failed with authentication error during clear');
              signOut();
              return;
            }
          } else {
            // Non-authentication error
            console.error('Non-authentication error during clear:', error.message);
            break; // Don't retry non-auth errors
          }
        } catch (clearError) {
          lastError = clearError;
          console.error(`Exception during clear attempt ${4 - retryCount}:`, clearError);
        }

        retryCount--;
        if (retryCount > 0) {
          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.error('Menu clear operation failed after all retries. Last error:', lastError?.message || lastError);
      console.error('Error clearing menu after all retries: ' + (lastError?.message || 'Unknown error'));
    } catch (error) {
      console.error('Unexpected error during menu clear:', error);
      console.error('Unexpected error clearing menu: ' + (error as Error).message);
    } finally {
      setClearingMenu(false);
    }
  };

  // Function to handle cafeteria profile update
  const handleUpdateCafeteriaProfile = async () => {
    if (!cafeteria) return;

    return withAuth(async () => {
      let finalImageUrl = cafeteria.image_url || '';

      // Upload new profile image if provided
      if (profileImageFile) {
        // Sanitize the filename to remove problematic characters
        const cleanFileName = profileImageFile.name
          .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace non-alphanumeric characters with underscore
          .replace(/_{2,}/g, '_') // Replace multiple underscores with single
          .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
          .toLowerCase(); // Convert to lowercase

        const fileName = `cafeteria-${Date.now()}-${cleanFileName}`;

        // Remove file if it already exists
        try {
          await supabase
            .storage
            .from('vendor-logos') // Using same bucket as vendor logos
            .remove([fileName]); // This won't cause an error if the file doesn't exist
        } catch (deleteError) {
          console.warn('Error removing existing file (may not exist):', deleteError);
          // Continue anyway since the file might not exist
        }

        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('vendor-logos') // Using same bucket as vendor logos
          .upload(fileName, profileImageFile, {
            cacheControl: '3600',
            upsert: true // Overwrite if exists
          });

        if (uploadError) {
          console.error('Cafeteria image upload failed:', uploadError);
          // Silently return without alert
          return;
        }

        // Get public URL
        const { data: publicUrlData } = supabase
          .storage
          .from('vendor-logos')
          .getPublicUrl(fileName);

        finalImageUrl = publicUrlData?.publicUrl || '';
      }

      // Update cafeteria profile
      const { error } = await supabase
        .from('cafeterias')
        .update({
          name: profileFormData.name,
          description: profileFormData.description,
          image_url: finalImageUrl,
        })
        .eq('id', cafeteria.id);

      if (error) {
        console.error('Update failed:', error);
        // Silently handle error without alert
      } else {
        // Update local state
        setCafeteria({
          ...cafeteria,
          name: profileFormData.name,
          description: profileFormData.description,
          image_url: finalImageUrl,
        });
        setShowProfileModal(false);
        setProfileImageFile(null);
        setProfileImagePreview('');
        // Silently handle success without alert
      }
    }, 'handleUpdateCafeteriaProfile');
  };

  // Function to handle profile image change
  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        console.error('Image file must be less than 2MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        console.error('Please upload an image file');
        return;
      }
      setProfileImageFile(file);
      setProfileImagePreview(URL.createObjectURL(file));
    }
  };

  // Function to remove profile image
  const removeProfileImage = () => {
    setProfileImageFile(null);
    setProfileImagePreview('');
    if (profileImagePreview) {
      URL.revokeObjectURL(profileImagePreview);
    }
  };

  // Function to open profile modal with current data
  const openProfileModal = () => {
    if (cafeteria) {
      setProfileFormData({
        name: cafeteria.name,
        description: cafeteria.description || '',
      });
      setProfileImagePreview(cafeteria.image_url || '');
      setShowProfileModal(true);
    }
  };

  // Function to close profile modal
  const closeProfileModal = () => {
    setShowProfileModal(false);
    setProfileImageFile(null);
    setProfileImagePreview('');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // Check if user is a vendor and hasn't been approved yet
  if (profile && profile.role === 'vendor') {
    if (loadingApproval) {
      return <div className="min-h-screen flex items-center justify-center">Checking approval status...</div>;
    }

    if (approvalStatus === false) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
            <Lock className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Pending Approval</h2>
            <p className="text-gray-600 mb-6">
              Your vendor account is currently under review by the admin. You will be notified once approved.
            </p>
            <button
              onClick={signOut}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      );
    }

    if (approvalStatus === null) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
            <Lock className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Approval Required</h2>
            <p className="text-gray-600 mb-6">
              Your vendor account needs to be approved by the admin before you can access the dashboard.
            </p>
            <button
              onClick={signOut}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      );
    }
  }

  if (!cafeteria) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Cafeteria Found</h2>
          <p className="text-gray-600">Your account is not linked to a cafeteria.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">{cafeteria.name}</h1>
              {/* Open/Close Toggle Button */}
              <button
                onClick={() => {
                  const newStatus = !isCafeteriaOpen;
                  setIsCafeteriaOpen(newStatus);
                  // Save to localStorage
                  if (cafeteria) {
                    localStorage.setItem(`cafeteria-open-${cafeteria.id}`, JSON.stringify(newStatus));
                  }
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${isCafeteriaOpen ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700'}`}
              >
                {isCafeteriaOpen ? 'Open' : 'Closed'}
              </button>
              <p className="text-sm text-gray-600">{profile?.full_name}</p>
            </div>
            <div className="flex items-center space-x-3">
              {/* Hamburger Menu */}
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              >
                {showMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Hamburger Menu Dropdown */}
          {showMenu && (
            <div className="absolute right-4 top-16 bg-white shadow-lg rounded-md py-2 w-48 z-50 border border-gray-200">
              <button
                onClick={() => {
                  openProfileModal();
                  setShowMenu(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Cafeteria Profile</span>
                </div>
              </button>
              <button
                onClick={() => {
                  setShowForm(true);
                  setShowMenu(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <div className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Add Menu Item</span>
                </div>
              </button>
              <button
                onClick={signOut}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <div className="flex items-center space-x-2">
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Menu Management</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleClearMenu}
              disabled={clearingMenu || !cafeteria}
              className="flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-70"
            >
              <span>{clearingMenu ? 'Clearing...' : 'Clear Menu'}</span>
            </button>
            <button
              onClick={handleSeedMenu}
              disabled={seedingMenu || !cafeteria}
              className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-70"
            >
              <Upload className="h-5 w-5" />
              <span>{seedingMenu ? 'Seeding...' : 'Seed Menu'}</span>
            </button>
            <button
              onClick={() => {
                setEditingItem(null);
                setShowForm(true);
              }}
              disabled={!cafeteria}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-5 w-5" />
              <span>Add Item</span>
            </button>
            <button
              onClick={() => {
                // Predefined Cafeteria 2 menu items
                const cafeteria2Menu = [
                  { name: 'White Rice', price: 400, category: 'Main Course', image_url: '' },
                  { name: 'Jollof rice', price: 400, category: 'Main Course', image_url: '' },
                  { name: 'Fried rice', price: 400, category: 'Main Course', image_url: '' },
                  { name: 'Porridge beans', price: 500, category: 'Main Course', image_url: '' },
                  { name: 'White beans', price: 500, category: 'Main Course', image_url: '' },
                  { name: 'White spag', price: 400, category: 'Main Course', image_url: '' },
                  { name: 'Jollof spag', price: 400, category: 'Main Course', image_url: '' },
                  { name: 'Macaroni', price: 400, category: 'Main Course', image_url: '' },
                  { name: 'Beef fish', price: 500, category: 'Protein', image_url: '' },
                  { name: 'Egg', price: 300, category: 'Protein', image_url: '' },
                  { name: 'Eba', price: 500, category: 'Swallow', image_url: '' },
                  { name: 'Semo', price: 500, category: 'Swallow', image_url: '' },
                  { name: 'Pounded Yam', price: 500, category: 'Swallow', image_url: '' },
                  { name: 'Amala', price: 500, category: 'Swallow', image_url: '' },
                  { name: 'Fufu', price: 500, category: 'Swallow', image_url: '' },
                  { name: 'Soup', price: 300, category: 'Side', image_url: '' },
                  { name: 'Ofada sauce', price: 300, category: 'Side', image_url: '' },
                  { name: 'Ofada rice', price: 400, category: 'Main Course', image_url: '' },
                  { name: 'Stew', price: 200, category: 'Side', image_url: '' },
                  { name: 'Chicken sauce', price: 1000, category: 'Side', image_url: '' },
                  { name: 'Fish sauce', price: 600, category: 'Side', image_url: '' },
                  { name: 'Basmati rice', price: 700, category: 'Main Course', image_url: '' },
                  { name: 'Oyster rice', price: 600, category: 'Main Course', image_url: '' },
                  { name: 'Carbonara rice', price: 700, category: 'Main Course', image_url: '' },
                  { name: 'Singapore spag', price: 500, category: 'Main Course', image_url: '' },
                  { name: 'Stir fry spag', price: 500, category: 'Main Course', image_url: '' },
                  { name: 'White spag', price: 400, category: 'Main Course', image_url: '' },
                  { name: 'Jollof spag', price: 400, category: 'Main Course', image_url: '' },
                ];
                handleBulkUploadMenu(cafeteria2Menu);
              }}
              disabled={!cafeteria}
              className="flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-70"
            >
              <Upload className="h-5 w-5" />
              <span>Upload Cafeteria 2 Menu</span>
            </button>
          </div>
        </div>

        {menuItems.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl">
            <p className="text-gray-600 text-lg mb-4">No menu items yet</p>
            <button
              onClick={() => {
                if (cafeteria) {
                  setShowForm(true);
                }
              }}
              disabled={!cafeteria}
              className="text-blue-600 hover:text-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add your first item
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map(item => (
              <div key={item.id} className={`bg-white rounded-xl shadow-md p-6 ${!item.is_available ? 'opacity-60' : ''}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                    <p className="text-xl font-bold text-blue-600 mt-1">#{item.price.toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => handleToggleAvailability(item)}
                    className={`p-2 rounded-lg ${item.is_available ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {item.is_available ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                  </button>
                </div>

                {item.description && (
                  <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                )}

                {item.category && (
                  <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full mb-3">
                    {item.category}
                  </span>
                )}

                {item.image_url && (
                  <div className="mt-2 mb-3">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-md"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <span className={`text-sm font-medium ${item.is_available ? 'text-green-600' : 'text-red-600'}`}>
                    {item.is_available ? 'In Stock' : 'Out of Stock'}
                  </span>
                  <button
                    onClick={() => {
                      setEditingItem(item);
                      setShowForm(true);
                    }}
                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {
        showForm && (
          <MenuItemForm
            item={editingItem}
            onSave={handleSaveItem} // Now passes imageFile as 2nd arg
            onClose={() => {
              setShowForm(false);
              setEditingItem(null);
            }}
          />
        )
      }

      {/* Cafeteria Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Cafeteria Profile</h2>
                <button
                  onClick={closeProfileModal}
                  className="p-2 rounded-full hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Cafeteria Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cafeteria Logo/Image
                  </label>
                  <div className="flex items-center space-x-6">
                    <div className="relative">
                      {profileImagePreview ? (
                        <div className="relative">
                          <img
                            src={profileImagePreview}
                            alt="Cafeteria preview"
                            className="w-32 h-32 rounded-xl object-cover border-2 border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={removeProfileImage}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-32 h-32 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                          <Camera className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col space-y-2">
                      <label className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleProfileImageChange}
                        />
                        Upload Image
                      </label>
                      <p className="text-xs text-gray-500">PNG, JPG up to 2MB</p>
                    </div>
                  </div>
                </div>

                {/* Cafeteria Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cafeteria Name
                  </label>
                  <input
                    type="text"
                    value={profileFormData.name}
                    onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your cafeteria name"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={profileFormData.description}
                    onChange={(e) => setProfileFormData({ ...profileFormData, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tell customers about your cafeteria"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={closeProfileModal}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateCafeteriaProfile}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <Save className="h-5 w-5" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div >
  );
};