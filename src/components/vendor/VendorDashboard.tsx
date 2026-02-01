import React, { useEffect, useState } from 'react';
import { LogOut, Plus, Edit2, ToggleLeft, ToggleRight, Menu, X, User, Camera, Save, MessageCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { MenuItem } from '../../lib/supabase/types';
import { supabase } from '../../lib/supabase/client';
import { Vendor, Order } from '../../lib/supabase/types';
import { MenuItemForm } from '../shared/MenuItemForm';
import { ChatModal } from '../shared/ChatModal';
import { RoleSwitcher } from '../shared/RoleSwitcher';

interface VendorDashboardProps {
  onShowProfile?: () => void;
}

export const VendorDashboard: React.FC<VendorDashboardProps> = ({ onShowProfile }) => {
  const { profile, signOut, checkApprovalStatus } = useAuth();
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
    delivery_option: 'offers_hostel_delivery' as 'offers_hostel_delivery' | 'does_not_offer_hostel_delivery',
  });
  const [approvalStatus, setApprovalStatus] = useState<boolean | null>(null);
  const [loadingApproval, setLoadingApproval] = useState(true);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [selectedOrderForChat, setSelectedOrderForChat] = useState<{ order: Order, chatWith: 'customer' | 'delivery' } | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [reviews, setReviews] = useState<any[]>([]); // Replace with proper type when available
  const [preferredRole, setPreferredRole] = useState<'customer' | 'vendor'>('vendor');
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    pendingOrders: 0,
    completedOrders: 0,
  });

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'accepted':
      case 'preparing':
        return 'bg-blue-100 text-blue-700';
      case 'ready':
      case 'picked_up':
        return 'bg-orange-100 text-orange-700';
      case 'delivered':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile]);

  useEffect(() => {
    // Check approval status for vendors
    if (profile && profile.role === 'vendor') {
      checkVendorApproval();
    }
  }, [profile]);

  // Show welcome message for new vendors who haven't uploaded a logo yet
  useEffect(() => {
    if (vendor && vendor.image_url && vendor.image_url.includes('placehold.co')) {
      // Show a subtle notification encouraging logo upload
      const showLogoPrompt = () => {
        const shouldShow = localStorage.getItem('vendorLogoPromptShown') !== 'true';
        if (shouldShow && vendor) {
          const shouldPrompt = confirm(
            `Welcome ${vendor.store_name}! \n\n` +
            `Your store has been created successfully. \n` +
            `To make your store stand out, consider uploading your business logo. \n\n` +
            `Would you like to upload your logo now?`
          );

          if (shouldPrompt) {
            openProfileModal();
          }

          localStorage.setItem('vendorLogoPromptShown', 'true');
        }
      };

      // Show prompt after a short delay to ensure UI is loaded
      const timer = setTimeout(showLogoPrompt, 2000);
      return () => clearTimeout(timer);
    }
  }, [vendor]);

  const fetchData = async () => {
    // Check and refresh session if needed
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (!session || sessionError) {
      console.error('User session not found or expired. Attempting to refresh...');

      // Try to refresh the session
      try {
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshedSession) {
          console.error('Session refresh failed during fetch:', refreshError);
          alert('Session expired. Please sign in again.');
          signOut();
          return;
        }

        // Session refreshed successfully
        console.log('Session refreshed successfully for fetch');
      } catch (refreshErr) {
        console.error('Error during session refresh for fetch:', refreshErr);
        alert('Session expired. Please sign in again.');
        signOut();
        return;
      }
    }

    if (!profile) return;

    // Only fetch data if vendor is approved
    if (['vendor', 'late_night_vendor'].includes(profile.role) && approvalStatus !== true) {
      setLoading(false);
      return;
    }

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
        .in('seller_type', ['vendor', 'late_night_vendor'])
        .order('name');

      if (items) setMenuItems(items);
    }

    setLoading(false);
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    // Check and refresh session if needed
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (!session || sessionError) {
      console.error('User session not found or expired. Attempting to refresh...');

      // Try to refresh the session
      try {
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshedSession) {
          console.error('Session refresh failed during toggle:', refreshError);
          alert('Session expired. Please sign in again.');
          signOut();
          return;
        }

        // Session refreshed successfully
        console.log('Session refreshed successfully for toggle');
      } catch (refreshErr) {
        console.error('Error during session refresh for toggle:', refreshErr);
        alert('Session expired. Please sign in again.');
        signOut();
        return;
      }
    }

    const { error } = await supabase
      .from('menu_items')
      .update({ is_available: !item.is_available })
      .eq('id', item.id);

    if (error) {
      console.error('Toggle availability failed:', error);
      // Check if it's an authentication error
      if (error.message.includes('401') || error.message.includes('403') ||
        error.message.toLowerCase().includes('auth') ||
        error.message.toLowerCase().includes('permission') ||
        error.message.toLowerCase().includes('unauthorized')) {
        alert('Authentication failed. Please sign in again.');
        signOut();
      }
    } else {
      setMenuItems(menuItems.map(i => i.id === item.id ? { ...i, is_available: !i.is_available } : i));
    }
  };

  const handleSaveItem = async (itemData: Partial<MenuItem>, imageFile?: File) => {
    if (!vendor) {
      console.error('No vendor found');
      alert('No vendor found. Please refresh the page.');
      return;
    }

    // Check and refresh session if needed
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (!session || sessionError) {
      console.error('User session not found or expired. Attempting to refresh...');

      // Try to refresh the session
      try {
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshedSession) {
          console.error('Session refresh failed:', refreshError);
          alert('Session expired. Please sign in again.');
          signOut();
          return;
        }

        // Session refreshed successfully
        console.log('Session refreshed successfully');
      } catch (refreshErr) {
        console.error('Error during session refresh:', refreshErr);
        alert('Session expired. Please sign in again.');
        signOut();
        return;
      }
    }

    let finalImageUrl = itemData.image_url || '';

    // Upload new image if provided
    if (imageFile) {
      // Sanitize the filename to remove problematic characters
      const cleanFileName = imageFile.name
        .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace non-alphanumeric characters with underscore
        .replace(/_{2,}/g, '_') // Replace multiple underscores with single
        .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
        .toLowerCase(); // Convert to lowercase

      const fileName = `food-${Date.now()}-${cleanFileName}`;

      // First, check if the file already exists and delete it if needed
      try {
        await supabase
          .storage
          .from('menu-images')
          .remove([fileName]); // This won't cause an error if the file doesn't exist
      } catch (deleteError) {
        console.warn('Error removing existing file (may not exist):', deleteError);
        // Continue anyway since the file might not exist
      }

      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('menu-images')
        .upload(fileName, imageFile, {
          cacheControl: '3600',
          upsert: true // Overwrite if exists
        });

      if (uploadError) {
        console.error('Image upload failed:', uploadError);
        // Check if it's an authentication/storage error
        if (uploadError.message.toLowerCase().includes('auth') ||
          uploadError.message.toLowerCase().includes('permission') ||
          uploadError.message.toLowerCase().includes('unauthorized') ||
          uploadError.message.includes('401') || uploadError.message.includes('403')) {
          alert('Authentication failed during upload. Please sign in again.');
          signOut();
        } else {
          alert(`Failed to upload image: ${uploadError.message}. Please try again.`);
        }
        return;
      }

      // Get public URL
      const { data: publicUrlData } = supabase
        .storage
        .from('menu-images')
        .getPublicUrl(fileName);

      finalImageUrl = publicUrlData?.publicUrl || '';
    }

    const fullItemData = {
      ...itemData,
      image_url: finalImageUrl,
      seller_id: vendor.id,
      seller_type: vendor.vendor_type === 'late_night' ? 'late_night_vendor' : 'vendor',
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
      // Check if it's an authentication error based on the error message
      if (error.message.includes('401') || error.message.includes('403') ||
        error.message.toLowerCase().includes('auth') ||
        error.message.toLowerCase().includes('permission') ||
        error.message.toLowerCase().includes('unauthorized')) {
        alert('Authentication failed. Please sign in again.');
        signOut();
      } else {
        alert('Failed to save menu item. Please try again.');
      }
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
      // Sanitize the filename to remove problematic characters
      const cleanFileName = profileImageFile.name
        .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace non-alphanumeric characters with underscore
        .replace(/_{2,}/g, '_') // Replace multiple underscores with single
        .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
        .toLowerCase(); // Convert to lowercase

      const fileName = `store-${Date.now()}-${cleanFileName}`;

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
      console.log('Uploaded store image URL:', finalImageUrl);
    }

    // Update vendor profile
    const { error } = await supabase
      .from('vendors')
      .update({
        store_name: profileFormData.store_name,
        description: profileFormData.description,
        image_url: finalImageUrl,
        delivery_option: profileFormData.delivery_option,
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
        delivery_option: vendor.delivery_option || 'offers_hostel_delivery',
      });
      setProfileImagePreview(vendor.image_url || '');
      setShowProfileModal(true);
    }
  };

  const checkVendorApproval = async () => {
    if (profile && ['vendor', 'late_night_vendor'].includes(profile.role)) {
      setLoadingApproval(true);
      const status = await checkApprovalStatus(profile.id, 'vendor');
      setApprovalStatus(status);
      setLoadingApproval(false);
    }
  };

  // Check for preferred role in sessionStorage
  useEffect(() => {
    const savedRole = sessionStorage.getItem('preferredRole');
    if (savedRole === 'customer' || savedRole === 'vendor') {
      setPreferredRole(savedRole);
    }
  }, []);

  // Handle role switching
  const handleRoleSwitch = (newRole: 'customer' | 'vendor') => {
    setPreferredRole(newRole);
    // Store in sessionStorage for persistence
    sessionStorage.setItem('preferredRole', newRole);

    // If switching to customer view, redirect
    if (newRole === 'customer') {
      window.location.href = '/#/customer'; // Or however you route to customer dashboard
    }

    // Show a toast or notification
    alert(`Switched to ${newRole === 'customer' ? 'Customer' : 'Vendor'} view`);
  };

  // Guard UI pattern to handle approval status without breaking hook rules
  let guardUI: React.ReactNode | null = null;

  if (profile && ['vendor', 'late_night_vendor'].includes(profile.role)) {
    if (loadingApproval) {
      guardUI = (
        <div className="min-h-screen flex items-center justify-center">
          Checking approval status...
        </div>
      );
    } else if (approvalStatus === false) {
      guardUI = (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
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
    } else if (approvalStatus === null) {
      guardUI = (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-yellow-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
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

  useEffect(() => {
    if (!vendor) return;
    fetchVendorOrders();
  }, [vendor]);

  // Return guard UI if needed (hooks already ran)
  if (guardUI) return guardUI;

  const fetchVendorOrders = async () => {
    if (!vendor) return;

    const { data: ordersData, error } = await supabase
      .from('orders')
      .select('*')
      .eq('seller_id', vendor.id)
      .order('created_at', { ascending: false });

    if (ordersData) {
      setMyOrders(ordersData);
      calculateMetrics(ordersData);
      fetchWalletInfo();
      fetchReviews();
    }
  };

  const fetchWalletInfo = async () => {
    // In a real implementation, this would fetch vendor wallet info
    // For now, we'll simulate a wallet balance
    setWalletBalance(5000); // Example balance
  };

  const fetchReviews = async () => {
    // In a real implementation, this would fetch reviews for the vendor
    // For now, we'll simulate some reviews
    setReviews([
      { id: 1, customer: 'John Doe', rating: 5, comment: 'Great food and fast delivery!', date: '2023-05-15' },
      { id: 2, customer: 'Jane Smith', rating: 4, comment: 'Delicious meals, will order again.', date: '2023-05-10' },
      { id: 3, customer: 'Bob Johnson', rating: 5, comment: 'Excellent service and quality.', date: '2023-05-05' },
    ]);
  };

  const calculateMetrics = (orders: Order[]) => {
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === 'delivered').length;
    const pendingOrders = orders.filter(o => ['pending', 'accepted', 'preparing', 'ready'].includes(o.status)).length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    setMetrics({
      totalOrders,
      totalRevenue,
      avgOrderValue,
      pendingOrders,
      completedOrders,
    });
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

      {/* Performance Metrics Section */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Orders</h3>
          <p className="text-3xl font-bold text-blue-600">{metrics.totalOrders}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Revenue</h3>
          <p className="text-3xl font-bold text-green-600">₦{metrics.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Avg Order Value</h3>
          <p className="text-3xl font-bold text-purple-600">₦{metrics.avgOrderValue.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Pending Orders</h3>
          <p className="text-3xl font-bold text-yellow-600">{metrics.pendingOrders}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Completed</h3>
          <p className="text-3xl font-bold text-green-600">{metrics.completedOrders}</p>
        </div>
      </div>

      {/* Vendor Orders Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Orders</h2>

        {myOrders.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-xl">
            <p className="text-gray-600">No orders received yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-xl overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Order #</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Customer</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Total</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {myOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">{order.order_number}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {/* Need to fetch customer name, showing ID for now */}
                      Customer
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString() : ''}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">₦{order.total.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedOrderForChat({ order, chatWith: 'customer' })}
                          className="flex items-center space-x-1 px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span>Chat</span>
                        </button>
                        {order.delivery_agent_id && (
                          <button
                            onClick={() => setSelectedOrderForChat({ order, chatWith: 'delivery' })}
                            className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                          >
                            <MessageCircle className="h-4 w-4" />
                            <span>Chat with DA</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <MenuItemForm
          item={editingItem as any}
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

                {/* Delivery Option */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Option
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="delivery_option"
                        value="offers_hostel_delivery"
                        checked={profileFormData.delivery_option === 'offers_hostel_delivery'}
                        onChange={(e) => setProfileFormData({ ...profileFormData, delivery_option: e.target.value as 'offers_hostel_delivery' | 'does_not_offer_hostel_delivery' })}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span>Offers hostel delivery</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="delivery_option"
                        value="does_not_offer_hostel_delivery"
                        checked={profileFormData.delivery_option === 'does_not_offer_hostel_delivery'}
                        onChange={(e) => setProfileFormData({ ...profileFormData, delivery_option: e.target.value as 'offers_hostel_delivery' | 'does_not_offer_hostel_delivery' })}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span>Does NOT offer hostel delivery</span>
                    </label>
                  </div>
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

      {/* Earnings/Wallet Section */}
      <div className="mt-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h2 className="text-2xl font-bold mb-2">Your Wallet</h2>
            <p className="text-lg opacity-90">Manage your earnings and transactions</p>
          </div>
          <div className="mt-4 md:mt-0 text-right">
            <p className="text-sm opacity-80">Available Balance</p>
            <p className="text-3xl font-bold">₦{walletBalance.toFixed(2)}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100">
            View Transactions
          </button>
          <button className="px-6 py-3 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800">
            Withdraw Funds
          </button>
          <button className="px-6 py-3 bg-transparent border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-blue-600">
            Transaction History
          </button>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Customer Reviews</h2>
          <span className="text-lg font-semibold text-yellow-600">⭐ 4.7 (24 reviews)</span>
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-xl">
            <p className="text-gray-600">No reviews yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map(review => (
              <div key={review.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-gray-900">{review.customer}</h3>
                  <div className="flex items-center">
                    {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                  </div>
                </div>
                <p className="text-gray-600 mb-3">{review.comment}</p>
                <p className="text-sm text-gray-500">{review.date}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Modal */}
      {selectedOrderForChat && (
        <ChatModal
          orderId={selectedOrderForChat.order.id}
          orderNumber={selectedOrderForChat.order.order_number}
          recipientName={selectedOrderForChat.chatWith === 'customer' ? "Customer" : "Delivery Agent"}
          onClose={() => setSelectedOrderForChat(null)}
        />
      )}

      {/* Role Switcher - only show if user has both customer and vendor capabilities */}
      {profile && (
        ['customer', 'vendor', 'late_night_vendor'].includes(profile.role)
      ) && (
          <RoleSwitcher
            currentRole={profile.role}
            onRoleSwitch={handleRoleSwitch}
          />
        )}
    </div>
  );
};