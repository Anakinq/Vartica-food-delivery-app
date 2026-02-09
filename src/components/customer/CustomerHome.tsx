// src/components/customer/CustomerHome.tsx
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Search, LogOut, User, Moon, Package, Heart } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Cafeteria, MenuItem } from '../../lib/supabase';
import { Vendor } from '../../lib/supabase/types';
import { supabase } from '../../lib/supabase/client';
import { MenuItemCard } from './MenuItemCard';
import { Checkout } from './Checkout';
import { OrderTracking } from './OrderTracking';
import { VendorUpgradeModal } from './VendorUpgradeModal';
import LazyImage from '../common/LazyImage';
import { CardSkeleton, ListSkeleton } from '../shared/LoadingSkeleton';
import { Skeleton } from '../shared/LoadingSkeleton';
import { useToast } from '../../contexts/ToastContext';
import { useCart } from '../../contexts/CartContext';

interface CustomerHomeProps {
  onShowProfile?: () => void;
}

interface Toast {
  id: number;
  message: string;
  isVisible: boolean;
}

const SkeletonCard = () => (
  <div className="bg-white rounded-2xl border border-stone-200 p-6 animate-pulse">
    <div className="w-16 h-16 bg-stone-200 rounded-xl mb-4"></div>
    <div className="h-5 bg-stone-200 rounded mb-2"></div>
    <div className="h-4 bg-stone-200 rounded w-3/4"></div>
  </div>
);

export const CustomerHome: React.FC<CustomerHomeProps> = ({ onShowProfile }) => {
  const { profile, signOut, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const {
    items: cartItems,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    cartCount,
    subtotal,
    isCartOpen,
    openCart,
    closeCart
  } = useCart();

  // Listen for cart modal open event from BottomNavigation
  useEffect(() => {
    const handleOpenCart = () => {
      openCart();
    };
    window.addEventListener('open-cart-modal', handleOpenCart);
    return () => window.removeEventListener('open-cart-modal', handleOpenCart);
  }, [openCart]);

  const [cafeterias, setCafeterias] = useState<Cafeteria[]>([]);
  const [studentVendors, setStudentVendors] = useState<Vendor[]>([]);
  const [lateNightVendors, setLateNightVendors] = useState<Vendor[]>([]);

  // State to track cafeteria open status
  const [cafeteriaStatus, setCafeteriaStatus] = useState<Record<string, boolean>>({});
  const [selectedSeller, setSelectedSeller] = useState<{ id: string; type: 'cafeteria' | 'vendor' | 'late_night_vendor'; name: string } | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [showOrders, setShowOrders] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [pulseCategory, setPulseCategory] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [cartPackCount, setCartPackCount] = useState(0);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showVendorUpgrade, setShowVendorUpgrade] = useState(false);
  const [preferredRole, setPreferredRole] = useState<'customer' | 'vendor'>('customer');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const toastId = useRef(0);

  // Define groupMenuItemsByCategory function before it's used
  const groupMenuItemsByCategory = (itemsToGroup: MenuItem[] = menuItems) => {
    // Get all unique categories from menu items
    const uniqueCategories = Array.from(new Set(itemsToGroup.map(item => item.category).filter(Boolean) as string[]));

    // Define priority order for categories
    const priorityCategories = [
      'Main Food', 'Protein', 'Swallow', 'Soup', 'Other',
      'Rice & Pasta', 'Proteins & Sides', 'Drinks', 'Meals', 'Main Course', 'Sides', 'Snacks', 'Salad'
    ];

    // Sort categories by priority
    const sortedCategories = [
      ...priorityCategories.filter(cat => uniqueCategories.includes(cat)),
      ...uniqueCategories.filter(cat => !priorityCategories.includes(cat))
    ];

    if (process.env.NODE_ENV === 'development') {
      console.log('Grouping menu items by categories:', sortedCategories);
      console.log('Current menu items:', itemsToGroup);
    }

    const result = sortedCategories.map(category => {
      const items = itemsToGroup.filter(item => item.category === category);
      if (process.env.NODE_ENV === 'development') {
        console.log(`Items in category ${category}:`, items);
      }
      return { category, items };
    }).filter(group => group.items.length > 0);

    if (process.env.NODE_ENV === 'development') {
      console.log('Grouped categories result:', result);
    }
    return result;
  };

  // Filter menu items based on search and favorites (for selected seller view)
  const sellerFilteredMenuItems = useMemo(() => {
    let items = menuItems;

    // Filter by search query
    if (globalSearchQuery.trim()) {
      items = items.filter(item =>
        item.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(globalSearchQuery.toLowerCase()))
      );
    }

    // Filter by favorites only
    if (showFavoritesOnly) {
      items = items.filter(item => favorites.includes(item.id));
    }

    return items;
  }, [menuItems, globalSearchQuery, favorites, showFavoritesOnly]);

  const groupedSellerCategories = groupMenuItemsByCategory(sellerFilteredMenuItems);

  const toggleFavorite = (itemId: string) => {
    setFavorites(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Memoize expensive computations
  const groupedMenuItems = useMemo(() => {
    return groupMenuItemsByCategory(menuItems);
  }, [menuItems]);

  // Debounced search
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(globalSearchQuery);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(globalSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [globalSearchQuery]);



  useEffect(() => {
    fetchData();
  }, []);

  // Listen for profile changes to detect role updates
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${profile.id}`
        },
        (payload) => {
          // If role changes from customer to vendor, just refresh the profile
          if (payload.old.role === 'customer' && payload.new.role === 'vendor') {
            // The profile will be updated automatically by the auth context
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  // Check for preferred role in sessionStorage on mount
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

    // If switching to vendor view and user is actually a vendor, redirect to vendor dashboard
    if (newRole === 'vendor' && profile?.role && ['vendor', 'late_night_vendor'].includes(profile.role)) {
      // This will cause the App component to render VendorDashboard
      window.location.hash = '#/vendor';
    }

    // If switching to customer view, ensure we're on the customer view
    if (newRole === 'customer') {
      window.location.hash = '';
    }

    // Show toast using the ToastContext
    const toastMessage = `Switched to ${newRole === 'customer' ? 'Customer' : 'Vendor'} view`;
    showToast({ type: 'info', message: toastMessage });
  };

  const handleScroll = useCallback(() => {
    if (!selectedSeller) return;

    const scrollPosition = window.scrollY + 200;
    const categories = groupMenuItemsByCategory();

    for (let i = categories.length - 1; i >= 0; i--) {
      const cat = categories[i];
      const el = categoryRefs.current[cat.category];
      if (el) {
        const { offsetTop } = el;
        if (scrollPosition >= offsetTop) {
          setActiveCategory(cat.category);
          break;
        }
      }
    }
  }, [selectedSeller, menuItems]);

  useEffect(() => {
    if (!selectedSeller) return;

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [selectedSeller, handleScroll]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cafeteriasRes, vendorsRes] = await Promise.all([
        supabase.from('cafeterias').select('*').eq('is_active', true).order('name'),
        supabase.from('vendors').select('*').eq('is_active', true).order('store_name'),
      ]);

      if (cafeteriasRes.error) {
        console.error('Error fetching cafeterias:', cafeteriasRes.error);
        showToast({ type: 'error', message: 'Failed to load cafeterias. Please try again.' });
      } else if (cafeteriasRes.data) {
        console.log('Fetched cafeterias:', cafeteriasRes.data);
        setCafeterias(cafeteriasRes.data);
        // Initialize cafeteria status (default to open for all)
        const initialStatus: Record<string, boolean> = {};
        cafeteriasRes.data.forEach(cafeteria => {
          initialStatus[cafeteria.id] = true; // Default to open
        });
        setCafeteriaStatus(initialStatus);
      }

      if (vendorsRes.error) {
        console.error('Error fetching vendors:', vendorsRes.error);
        showToast({ type: 'error', message: 'Failed to load vendors. Please try again.' });
      } else if (vendorsRes.data) {
        const students = vendorsRes.data.filter(v => v.vendor_type === 'student');
        const lateNight = vendorsRes.data.filter(v => v.vendor_type === 'late_night');
        setStudentVendors(students);
        setLateNightVendors(lateNight);
      }
    } catch (error) {
      console.error('Unexpected error in fetchData:', error);
      showToast({ type: 'error', message: 'Failed to load data. Please check your connection and try again.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async (sellerId: string, sellerType: 'cafeteria' | 'vendor' | 'late_night_vendor') => {
    console.log('Fetching menu items for:', { sellerId, sellerType });
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('seller_type', sellerType)
      .eq('is_available', true)
      .order('name');

    if (error) {
      console.error('Error fetching menu items:', error);
    } else {
      console.log('Fetched menu items:', data);
      setMenuItems(data || []);
    }
  };

  const handleSellerClick = async (id: string, type: 'cafeteria' | 'vendor' | 'late_night_vendor', name: string) => {
    setSelectedSeller({ id, type, name });
    await fetchMenuItems(id, type);
  };

  const handleClearCart = () => {
    clearCart();
  };

  const filteredCafeterias = useMemo(() => {
    return cafeterias.filter(c =>
      c.name.toLowerCase().includes(globalSearchQuery.toLowerCase())
    );
  }, [cafeterias, globalSearchQuery]);

  const filteredVendors = useMemo(() => {
    return studentVendors.filter(v =>
      v.store_name.toLowerCase().includes(globalSearchQuery.toLowerCase())
    );
  }, [studentVendors, globalSearchQuery]);

  const deliveryFee = 500;

  const allSellersInOrder = useMemo(() => {
    const list: Array<{ id: string; type: 'cafeteria' | 'vendor'; name: string }> = [];
    filteredCafeterias.forEach(c => list.push({ id: c.id, type: 'cafeteria', name: c.name }));
    filteredVendors.forEach(v => list.push({ id: v.id, type: 'vendor', name: v.store_name }));
    lateNightVendors.forEach(v => list.push({ id: v.id, type: 'vendor', name: v.store_name }));
    return list;
  }, [filteredCafeterias, filteredVendors, lateNightVendors]);

  // Function to determine if cafeteria is open
  const isCafeteriaOpen = (cafeteriaId: string): boolean => {
    // First check the state, then fallback to localStorage, then default to true
    if (cafeteriaStatus[cafeteriaId] !== undefined) {
      return cafeteriaStatus[cafeteriaId];
    }

    try {
      if (typeof window !== 'undefined') {
        // Use the same SafeStorage instance that Supabase uses
        const safeStorage = (supabase.auth as any)._client.storage;
        // Check localStorage for the status
        const savedStatus = safeStorage.getItem(`cafeteria-open-${cafeteriaId}`);
        if (savedStatus !== null) {
          return JSON.parse(savedStatus);
        }
      }
    } catch (e) {
      console.warn('Could not read cafeteria status from localStorage:', e);
    }

    // Default to true (open) if no status is found
    return true;
  };

  // Helper function to generate Supabase public URLs
  const getSupabaseImageUrl = (imageUrl: string | null, bucket: string, folder: string) => {
    if (!imageUrl) return null;

    // If it's already a full URL, return as is
    if (imageUrl.startsWith('http')) {
      // Check if it's already a Supabase public URL
      if (imageUrl.includes('supabase.co')) {
        // Decode any URL-encoded characters that might cause 400 errors
        return decodeURIComponent(imageUrl);
      }
      return imageUrl;
    }

    // If it's a relative path starting with /images/, return as is
    if (imageUrl.startsWith('/images/')) {
      return imageUrl;
    }

    // It's likely a file name that needs to be converted to a public URL
    const filePath = `${folder}/${imageUrl}`;
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  };

  const getImagePath = (sellerId: string, sellerType: 'cafeteria' | 'vendor', sellerName?: string) => {
    // Check if this is a late night vendor
    const isLateNightVendor = lateNightVendors.some(v => v.id === sellerId);
    if (isLateNightVendor && sellerType === 'vendor') {
      return '/images/latenightvendor.jpg';
    }

    // For cafeterias, use name-based mapping
    if (sellerType === 'cafeteria' && sellerName) {
      console.log('Getting image for cafeteria:', sellerName);
      const nameMap: Record<string, string> = {
        'Cafeteria 1': 'caf 1',
        'Cafeteria 2': 'caf 2',
        'Med Cafeteria': 'med caf',
        'Smoothie Shack': 'smoothie shack',
        'Staff Cafeteria': 'staff caf',
        'Captain Cook': 'captain cook'
        // Seasons Deli will use default numbering
      };

      const mappedName = nameMap[sellerName];
      if (mappedName) {
        console.log('Mapped name:', mappedName);
        // Map to correct file extensions based on your actual files
        const extensionMap: Record<string, string> = {
          'caf 1': '.png',
          'caf 2': '.png',
          'staff caf': '.png',
          'captain cook': '.png',
          'med caf': '.jpeg',
          'smoothie shack': '.png'
        };
        const ext = extensionMap[mappedName] || '.jpg';
        const imagePath = `/images/${mappedName}${ext}`;
        console.log('Returning image path:', imagePath);
        return imagePath;
      }
    }

    // For cafeterias without custom mapping, use their position in the cafeteria array
    if (sellerType === 'cafeteria') {
      const index = cafeterias.findIndex(c => c.id === sellerId);
      if (index !== -1) {
        return `/images/${index + 1}.jpg`;
      }
    }

    // For student vendors, use their position in the student vendor array
    if (sellerType === 'vendor') {
      const index = studentVendors.findIndex(v => v.id === sellerId);
      if (index !== -1) {
        // Start from the next available number after cafeterias
        const cafeteriaCount = cafeterias.length;
        return `/images/${cafeteriaCount + index + 1}.jpg`;
      }
    }

    // Fallback to original logic
    const index = allSellersInOrder.findIndex(s => s.id === sellerId && s.type === sellerType);
    return `/images/${index + 1}.jpg`;
  };

  const handleCategoryClick = (category: string) => {
    setPulseCategory(category);
    setTimeout(() => setPulseCategory(null), 300);

    const el = categoryRefs.current[category];
    if (el) {
      const offset = 160;
      const top = el.offsetTop - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  // Filter menu items based on search query when a seller is selected
  const searchedMenuItems = useMemo(() => {
    if (!selectedSeller || !globalSearchQuery.trim()) {
      return menuItems;
    }

    return menuItems.filter(item =>
      item.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(globalSearchQuery.toLowerCase()))
    );
  }, [menuItems, globalSearchQuery, selectedSeller]);

  const groupedCategories = groupMenuItemsByCategory(searchedMenuItems);

  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!selectedSeller) {
      setItemQuantities({});
      return;
    }

    const newQuantities: Record<string, number> = {};
    cartItems.forEach(item => {
      if (item.seller_id === selectedSeller.id && item.seller_type === selectedSeller.type) {
        newQuantities[item.id] = item.quantity;
      }
    });
    setItemQuantities(newQuantities);
  }, [selectedSeller, cartItems]);

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    const oldQuantity = itemQuantities[itemId] || 0;
    setItemQuantities(prev => ({ ...prev, [itemId]: newQuantity }));

    const item = menuItems.find(m => m.id === itemId);
    if (!item) return;

    // If quantity is decreasing, just update the cart
    if (newQuantity < oldQuantity) {
      updateQuantity(itemId, newQuantity);
      return;
    }

    // If quantity is increasing by 1 from cart, update the cart
    if (newQuantity === oldQuantity + 1) {
      addItem(item);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 w-full max-w-full">
      {/* Fixed Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Vartica Logo */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSelectedSeller(null)}
                className="text-2xl font-bold text-black hover:text-gray-700 transition-colors duration-200"
                aria-label="Back to home"
              >
                Vartica
              </button>
              {selectedSeller && (
                <span className="text-gray-500 text-sm truncate max-w-[100px] sm:max-w-[200px]">/ {selectedSeller.name}</span>
              )}
            </div>

            {/* Right side icons: My Orders, Profile */}
            <div className="flex items-center space-x-4">
              {/* My Orders */}
              <button
                onClick={() => setShowOrders(true)}
                className="p-2 text-gray-700 hover:text-green-600 transition-colors duration-200"
                title="My Orders"
                aria-label="View orders"
              >
                <Package className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>

              {/* Profile */}
              <button
                onClick={() => {
                  console.log('CustomerHome: Profile button clicked');
                  onShowProfile?.();
                }}
                className="flex items-center space-x-1 sm:space-x-2 text-gray-700 hover:text-green-600 transition-colors duration-200"
                aria-label="View profile"
              >
                {(profile as any)?.avatar_url ? (
                  <img
                    src={(profile as any).avatar_url}
                    alt="Profile"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-gray-200"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.onerror = null;
                      target.src = 'https://placehold.co/40x40/4ade80/ffffff?text=' + (profile?.full_name?.charAt(0).toUpperCase() || 'U');
                    }}
                  />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs sm:text-sm font-bold">
                    {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <span className="hidden sm:inline text-sm">{profile?.full_name}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content - scrolls independently */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 bg-[#121212] min-h-screen pt-20 pb-20">
        <div className="mb-4 sm:mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="relative flex-1 mr-4">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                placeholder={selectedSeller ? "Search menu items..." : "Search for food, vendors, or cafeterias..."}
                className="w-full pl-10 pr-4 py-3 sm:py-4 bg-[#1e1e1e] border border-[#333] rounded-full focus:ring-2 focus:ring-[#FF9500] focus:bg-[#1e1e1e] transition-all text-sm sm:text-base text-white placeholder-gray-400"
                aria-label={selectedSeller ? "Search menu items" : "Search food or vendors"}
              />
            </div>
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`p-3 rounded-full ${showFavoritesOnly ? 'bg-[#FF9500] text-black' : 'bg-[#1e1e1e] text-gray-400 hover:text-white'}`}
            >
              <Heart className={`h-5 w-5 ${showFavoritesOnly ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {selectedSeller && sellerFilteredMenuItems.length > 0 && (
          <div className="sticky top-16 sm:top-20 z-30 bg-[#121212] py-3 mb-4 -mx-4 px-4 border-b border-[#333]">
            <div className="flex flex-col space-y-3">
              <div className="flex overflow-x-auto pb-1 space-x-3 hide-scrollbar">
                {groupedSellerCategories.map(({ category }) => (
                  <button
                    key={category}
                    onClick={() => handleCategoryClick(category)}
                    className={`
                      whitespace-nowrap px-3 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200
                      ${pulseCategory === category
                        ? 'bg-[#FF9500] text-black scale-105'
                        : activeCategory === category
                          ? 'bg-[#FF9500] text-black'
                          : 'bg-[#1e1e1e] text-gray-300 hover:bg-[#2a2a2a] hover:text-white active:scale-95'}
                    `}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {!selectedSeller ? (
          <>
            <section className="mb-12">
              <h2 className="text-xl sm:text-2xl font-bold text-black mb-4 sm:mb-6">Cafeterias</h2>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {filteredCafeterias.map((cafeteria: Cafeteria) => {
                    const isSelected = selectedSeller !== null &&
                      (selectedSeller as { id: string; type: 'cafeteria' | 'vendor'; name: string }).id === cafeteria.id &&
                      (selectedSeller as { id: string; type: 'cafeteria' | 'vendor'; name: string }).type === 'cafeteria';
                    return (
                      <div
                        key={cafeteria.id}
                        onClick={() => handleSellerClick(cafeteria.id, 'cafeteria', cafeteria.name)}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        aria-label={`Select ${cafeteria.name}`}
                        className={`bg-white rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${isSelected ? 'ring-2 ring-green-600' : 'hover:shadow-md'}`}
                      >
                        <LazyImage
                          src={(() => {
                            const supabaseUrl = getSupabaseImageUrl(cafeteria.image_url || null, 'vendor-logos', 'vendor-logos');
                            return supabaseUrl || cafeteria.image_url || (() => {
                              const path = getImagePath(cafeteria.id, 'cafeteria', cafeteria.name);
                              console.log(`Using image path for ${cafeteria.name}:`, path);
                              return path;
                            })();
                          })()}
                          alt={cafeteria.name}
                          className="w-full h-32 sm:h-40 object-cover"
                          fallback="https://placehold.co/600x400/e2e8f0/64748b?text=No+Image"
                          onError={() => {
                            console.log('Image error for cafeteria:', cafeteria.name);
                          }}
                        />
                        <div className="p-4">
                          <h3 className="font-bold text-black text-base sm:text-lg truncate">{cafeteria.name}</h3>
                          {/* Description removed - showing only cafeteria name/logo */}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="mb-12">
              <h2 className="text-xl sm:text-2xl font-bold text-black mb-4 sm:mb-6">Student Vendors</h2>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : filteredVendors.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {filteredVendors.map((vendor: Vendor) => {
                    const isSelected = selectedSeller !== null &&
                      (selectedSeller as { id: string; type: 'cafeteria' | 'vendor'; name: string }).id === vendor.id &&
                      (selectedSeller as { id: string; type: 'cafeteria' | 'vendor'; name: string }).type === 'vendor';
                    return (
                      <div
                        key={vendor.id}
                        onClick={() => handleSellerClick(vendor.id, 'vendor', vendor.store_name)}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        aria-label={`Select ${vendor.store_name}`}
                        className={`bg-white rounded-xl overflow-hidden cursor-pointer relative transition-all duration-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${isSelected ? 'ring-2 ring-green-600' : 'hover:shadow-md'}`}
                      >
                        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex flex-col items-end space-y-1">
                          <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full z-10 font-medium">
                            Student
                          </span>
                          {vendor.delivery_option === 'offers_hostel_delivery' ? (
                            <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full z-10 font-medium">
                              Hostel Delivery
                            </span>
                          ) : (
                            <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full z-10 font-medium">
                              Pickup Only
                            </span>
                          )}
                        </div>
                        <LazyImage
                          src={(() => {
                            const supabaseUrl = getSupabaseImageUrl(vendor.image_url || null, 'vendor-logos', 'vendor-logos');
                            console.log('Vendor image processing:', { original: vendor.image_url, processed: supabaseUrl });
                            return supabaseUrl || vendor.image_url || getImagePath(vendor.id, 'vendor');
                          })()}
                          alt={vendor.store_name}
                          className="w-full h-32 sm:h-40 object-cover"
                          fallback="https://placehold.co/600x400/e2e8f0/64748b?text=No+Image"
                          onError={() => {
                            console.log('Image error for vendor:', vendor.store_name);
                          }}
                        />
                        <div className="p-4">
                          <h3 className="font-bold text-black text-base sm:text-lg truncate">{vendor.store_name}</h3>
                          <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-1">{vendor.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No student vendors available yet
                </div>
              )}
            </section>

            {lateNightVendors.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center space-x-2 mb-4 sm:mb-6">
                  <Moon className="h-5 w-5 sm:h-6 sm:w-6 text-stone-700" />
                  <h2 className="text-xl sm:text-2xl font-bold text-stone-800">Late-Night Vendors</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {lateNightVendors.map(vendor => (
                    <div
                      key={vendor.id}
                      onClick={() => handleSellerClick(vendor.id, 'vendor', vendor.store_name)}
                      role="button"
                      tabIndex={0}
                      aria-pressed={selectedSeller !== null && (selectedSeller as { id: string; type: 'cafeteria' | 'vendor'; name: string }).id === vendor.id}
                      aria-label={`Select ${vendor.store_name}`}
                      className={
                        `bg-white rounded-2xl border border-stone-200 p-6 cursor-pointer relative transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${selectedSeller !== null && (selectedSeller as { id: string; type: 'cafeteria' | 'vendor'; name: string }).id === vendor.id ? 'border-orange-500 bg-orange-50' : 'border-stone-200 hover:border-orange-300'}`
                      }
                    >
                      <span className="absolute top-2 right-2 bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full flex items-center">
                        <Moon className="h-3 w-3 mr-1" /> Late Night
                      </span>
                      <LazyImage
                        src={(() => {
                          const supabaseUrl = getSupabaseImageUrl(vendor.image_url || null, 'vendor-logos', 'vendor-logos');
                          return supabaseUrl || vendor.image_url || getImagePath(vendor.id, 'vendor');
                        })()}
                        alt={vendor.store_name}
                        className="w-full h-32 sm:h-40 object-cover rounded-xl mb-4"
                        fallback="https://placehold.co/600x400/e2e8f0/64748b?text=No+Image"
                      />
                      <h3 className="font-bold text-stone-800 text-lg sm:text-xl truncate">{vendor.store_name}</h3>
                      <p className="text-xs sm:text-sm text-stone-600 mt-1 line-clamp-1">{vendor.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <section className="mb-20">
            <div ref={(el) => { categoryRefs.current['all'] = el; }}>
              {groupedCategories.map(({ category, items }) => (
                <div
                  key={category}
                  ref={(el) => { categoryRefs.current[category] = el; }}
                  className="mb-8"
                >
                  <div className="flex items-center space-x-2 mb-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-black">{category}</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {items.map(item => (
                      <MenuItemCard
                        key={item.id}
                        item={item}
                        quantity={itemQuantities[item.id] || 0}
                        onQuantityChange={(_, newQuantity) => handleQuantityChange(item.id, newQuantity)}
                        isFavorite={favorites.includes(item.id)}
                        onToggleFavorite={() => toggleFavorite(item.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {sellerFilteredMenuItems.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🍽️</div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">
                  {globalSearchQuery
                    ? 'No items found'
                    : showFavoritesOnly
                      ? 'No favorite items yet'
                      : 'No items available'}
                </h3>
                <p className="text-gray-500">
                  {globalSearchQuery
                    ? 'Try adjusting your search'
                    : showFavoritesOnly
                      ? 'Tap the heart icon on items to save them!'
                      : 'Check back later for new items'}
                </p>
              </div>
            )}
          </section>
        )}
      </div>

      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg transform transition-all duration-300 ${toast.isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <Checkout
          items={cartItems}
          subtotal={subtotal}
          deliveryFee={deliveryFee}
          packCount={cartPackCount}
          onBack={() => setShowCheckout(false)}
          onClose={() => setShowCheckout(false)}
          onSuccess={() => {
            setCartPackCount(0);
            setShowCheckout(false);
            showToast({ type: 'success', message: 'Order placed successfully!' });
          }}
        />
      )}

      {showOrders && <OrderTracking onClose={() => setShowOrders(false)} />}

      {showVendorUpgrade && (
        <VendorUpgradeModal
          isOpen={showVendorUpgrade}
          onClose={() => setShowVendorUpgrade(false)}
          onSuccess={async () => {
            setShowVendorUpgrade(false);
            showToast({ type: 'success', message: 'Application submitted successfully! Awaiting approval.' });

            // Refresh the profile data instead of reloading the page
            try {
              await refreshProfile();
              // Optionally show another toast to inform user
              showToast({ type: 'info', message: 'Profile updated. Please refresh if changes are not visible.' });
            } catch (error) {
              console.error('Error refreshing profile:', error);
              // Fallback to showing a message to user
              showToast({ type: 'warning', message: 'Please refresh the page to see profile changes.' });
            }
          }}
        />
      )}

    </div>
  );
};
