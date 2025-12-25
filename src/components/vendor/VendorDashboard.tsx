import React, { useEffect, useState } from 'react';
import { LogOut, Plus, Edit2, ToggleLeft, ToggleRight, Menu, X, User, Camera, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, MenuItem, Vendor } from '../../lib/supabase';
import { MenuItemForm } from '../shared/MenuItemForm';

export const VendorDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>('');
  const [profileFormData, setProfileFormData] = useState({
    store_name: '',
    description: '',
  });

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;

    const { data: vendorData } = await supabase
      .from('vendors')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (vendorData) {
      setVendor(vendorData);

      const { data: items } = await supabase
        .from('menu_items')
        .select('*')
        .eq('seller_id', vendorData.id)
        .eq('seller_type', 'vendor')
        .order('name');

      if (items) setMenuItems(items);
    }

    setLoading(false);
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    const { error } = await supabase
      .from('menu_items')
      .update({ is_available: !item.is_available })
      .eq('id', item.id);

    if (!error) {
      setMenuItems(menuItems.map(i => i.id === item.id ? { ...i, is_available: !i.is_available } : i));
    }
  };

  const handleSaveItem = async (itemData: Partial<MenuItem>, imageFile?: File) => {
    if (!vendor) return;

    let finalImageUrl = itemData.image_url || '';

    // Upload new image if provided
    if (imageFile) {
      const fileName = `food-${Date.now()}-${imageFile.name}`;

      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('food-images')
        .upload(fileName, imageFile);

      if (uploadError) {
        console.error('Image upload failed:', uploadError);
        alert('Failed to upload image. Please try again.');
        return;
      }

      // Get public URL
      const { data: publicUrlData } = supabase
        .storage
        .from('food-images')
        .getPublicUrl(fileName);

      finalImageUrl = publicUrlData.publicUrl;
    }

    const fullItemData = {
      ...itemData,
      image_url: finalImageUrl,
      seller_id: vendor.id,
      seller_type: 'vendor',
    };

    let query;
    if (editingItem) {
      query = supabase
        .from('menu_items')
        .update(fullItemData)
        .eq('id', editingItem.id);
    } else {
      query = supabase
        .from('menu_items')
        .insert([fullItemData]);
    }

    const { error } = await query;
    if (error) {
      console.error('Save failed:', error);
      alert('Failed to save menu item. Please try again.');
    } else {
      await fetchData();
      setShowForm(false);
      setEditingItem(null);
    }
  };

  // Function to handle store profile update
  const handleUpdateStoreProfile = async () => {
    if (!vendor) return;

    let finalImageUrl = vendor.image_url || '';

    // Upload new profile image if provided
    if (profileImageFile) {
      const fileName = `store-${Date.now()}-${profileImageFile.name}`;

      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('vendor-logos')
        .upload(fileName, profileImageFile);

      if (uploadError) {
        console.error('Store image upload failed:', uploadError);
        alert('Failed to upload store image. Please try again.');
        return;
      }

      // Get public URL
      const { data: publicUrlData } = supabase
        .storage
        .from('vendor-logos')
        .getPublicUrl(fileName);

      finalImageUrl = publicUrlData.publicUrl;
    }

    // Update vendor profile
    const { error } = await supabase
      .from('vendors')
      .update({
        store_name: profileFormData.store_name,
        description: profileFormData.description,
        image_url: finalImageUrl,
      })
      .eq('id', vendor.id);

    if (error) {
      console.error('Update failed:', error);
      alert('Failed to update store profile. Please try again.');
    } else {
      // Update local state
      setVendor({
        ...vendor,
        store_name: profileFormData.store_name,
        description: profileFormData.description,
        image_url: finalImageUrl,
      });
      setShowProfileModal(false);
      setProfileImageFile(null);
      setProfileImagePreview('');
      alert('Store profile updated successfully!');
    }
  };

  // Function to handle profile image change
  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert('Image file must be less than 2MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
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
    if (vendor) {
      setProfileFormData({
        store_name: vendor.store_name,
        description: vendor.description || '',
      });
      setProfileImagePreview(vendor.image_url || '');
      setShowProfileModal(true);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Vendor Store Found</h2>
          <p className="text-gray-600">Your account is not linked to a vendor store.</p>
        </div>
      </div>
    );
  }

  // Function to close profile modal
  const closeProfileModal = () => {
    setShowProfileModal(false);
    setProfileImageFile(null);
    setProfileImagePreview('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{vendor.store_name}</h1>
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

              <button
                onClick={signOut}
                className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-red-600"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            </div>
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
                <span>Store Profile</span>
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
          </div>
        )}
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Menu Management</h2>
          <button
            onClick={() => {
              setEditingItem(null);
              setShowForm(true);
            }}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            <span>Add Item</span>
          </button>
        </div>

        {menuItems.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl">
            <p className="text-gray-600 text-lg mb-4">No menu items yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="text-blue-600 hover:text-blue-700 font-semibold"
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
                    <p className="text-xl font-bold text-blue-600 mt-1">₦{item.price.toFixed(2)}</p>
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

      {showForm && (
        <MenuItemForm
          item={editingItem}
          onSave={handleSaveItem}
          onClose={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
        />
      )}

      {/* Store Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Store Profile</h2>
                <button
                  onClick={closeProfileModal}
                  className="p-2 rounded-full hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Store Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Store Logo/Image
                  </label>
                  <div className="flex items-center space-x-6">
                    <div className="relative">
                      {profileImagePreview ? (
                        <div className="relative">
                          <img
                            src={profileImagePreview}
                            alt="Store preview"
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

                {/* Store Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Store Name
                  </label>
                  <input
                    type="text"
                    value={profileFormData.store_name}
                    onChange={(e) => setProfileFormData({ ...profileFormData, store_name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your store name"
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
                    placeholder="Tell customers about your store"
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
                    onClick={handleUpdateStoreProfile}
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
    </div>
  );
};