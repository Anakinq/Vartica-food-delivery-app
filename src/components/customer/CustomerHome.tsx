// src/components/customer/CustomerHome.tsx
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Search, ShoppingCart, LogOut, User, Moon, Package } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Cafeteria, Vendor, MenuItem } from '../../lib/supabase';
import { supabase } from '../../lib/supabase/client';
import { MenuItemCard } from './MenuItemCard';
import { Cart } from './Cart';
import { Checkout } from './Checkout';
import { OrderTracking } from './OrderTracking';

interface CartItem extends MenuItem {
  quantity: number;
}

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
  const { profile, signOut } = useAuth();
  const [cafeterias, setCafeterias] = useState<Cafeteria[]>([]);
  const [studentVendors, setStudentVendors] = useState<Vendor[]>([]);
  const [lateNightVendor, setLateNightVendor] = useState<Vendor | null>(null);

  // State to track cafeteria open status
  const [cafeteriaStatus, setCafeteriaStatus] = useState<Record<string, boolean>>({});
  const [selectedSeller, setSelectedSeller] = useState<{ id: string; type: 'cafeteria' | 'vendor'; name: string } | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [pulseCategory, setPulseCategory] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [cartPackCount, setCartPackCount] = useState(0);
  const [showCheckout, setShowCheckout] = useState(false);

  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const toastId = useRef(0);

  const showToast = (message: string) => {
    const id = toastId.current++;
    const newToast: Toast = { id, message, isVisible: true };
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, isVisible: false } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 300);
    }, 2000);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedSeller) return;

    const handleScroll = () => {
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
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [selectedSeller, menuItems]);

  const fetchData = async () => {
    setLoading(true);
    const [cafeteriasRes, vendorsRes] = await Promise.all([
      supabase.from('cafeterias').select('*').eq('is_active', true).order('name'),
      supabase.from('vendors').select('*').eq('is_active', true).order('store_name'),
    ]);

    if (cafeteriasRes.data) {
      setCafeterias(cafeteriasRes.data);
      // Initialize cafeteria status (default to open for all)
      const initialStatus: Record<string, boolean> = {};
      cafeteriasRes.data.forEach(cafeteria => {
        initialStatus[cafeteria.id] = true; // Default to open
      });
      setCafeteriaStatus(initialStatus);
    }
    if (vendorsRes.data) {
      const students = vendorsRes.data.filter(v => v.vendor_type === 'student');
      const lateNight = vendorsRes.data.find(v => v.vendor_type === 'late_night');
      setStudentVendors(students);
      if (lateNight) setLateNightVendor(lateNight);
    }
    setLoading(false);
  };

  const fetchMenuItems = async (sellerId: string, sellerType: 'cafeteria' | 'vendor') => {
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

  const handleSellerClick = async (id: string, type: 'cafeteria' | 'vendor', name: string) => {
    setSelectedSeller({ id, type, name });
    await fetchMenuItems(id, type);
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (quantity === 0) {
      setCart(cart.filter(i => i.id !== itemId));
    } else {
      setCart(cart.map(i => i.id === itemId ? { ...i, quantity } : i));
    }
  };

  const handleClearCart = () => {
    setCart([]);
  };

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

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = 500;

  const allSellersInOrder = useMemo(() => {
    const list: Array<{ id: string; type: 'cafeteria' | 'vendor'; name: string }> = [];
    filteredCafeterias.forEach(c => list.push({ id: c.id, type: 'cafeteria', name: c.name }));
    filteredVendors.forEach(v => list.push({ id: v.id, type: 'vendor', name: v.store_name }));
    if (lateNightVendor) list.push({ id: lateNightVendor.id, type: 'vendor', name: lateNightVendor.store_name });
    return list;
  }, [filteredCafeterias, filteredVendors, lateNightVendor]);

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

  const getImagePath = (sellerId: string, sellerType: 'cafeteria' | 'vendor') => {
    // Check if this is a late night vendor
    if (lateNightVendor && sellerId === lateNightVendor.id && sellerType === 'vendor') {
      return '/images/latenightvendor.jpg';
    }

    // For cafeterias, use their position in the cafeteria array
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
  const filteredMenuItems = useMemo(() => {
    if (!selectedSeller || !globalSearchQuery.trim()) {
      return menuItems;
    }

    return menuItems.filter(item =>
      item.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(globalSearchQuery.toLowerCase()))
    );
  }, [menuItems, globalSearchQuery, selectedSeller]);

  const groupedCategories = groupMenuItemsByCategory(filteredMenuItems);

  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!selectedSeller) {
      setItemQuantities({});
      return;
    }

    const newQuantities: Record<string, number> = {};
    cart.forEach(item => {
      if (item.seller_id === selectedSeller.id && item.seller_type === selectedSeller.type) {
        newQuantities[item.id] = item.quantity;
      }
    });
    setItemQuantities(newQuantities);
  }, [selectedSeller, cart]);

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    const oldQuantity = itemQuantities[itemId] || 0;
    setItemQuantities(prev => ({ ...prev, [itemId]: newQuantity }));

    const item = menuItems.find(m => m.id === itemId);
    if (!item) return;

    if (newQuantity > oldQuantity) {
      const added = newQuantity - oldQuantity;
      showToast(`${added} ${added === 1 ? 'item' : 'items'} added`);
    }

    if (newQuantity === 0) {
      setCart(prev => prev.filter(i => i.id !== itemId));
    } else {
      if (cart.length > 0 && (cart[0].seller_id !== item.seller_id || cart[0].seller_type !== item.seller_type)) {
        if (!confirm('Adding items from a different vendor will clear your current cart. Continue?')) {
          setItemQuantities(prev => ({ ...prev, [itemId]: oldQuantity }));
          return;
        }
        setCart([{ ...item, quantity: newQuantity }]);
      } else {
        const existing = cart.find(i => i.id === itemId);
        if (existing) {
          setCart(cart.map(i => i.id === itemId ? { ...i, quantity: newQuantity } : i));
        } else {
          setCart([...cart, { ...item, quantity: newQuantity }]);
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSelectedSeller(null)}
                className="text-2xl font-bold text-black hover:text-gray-700 transition-colors duration-200"
                aria-label="Back to home"
              >
                Vartica
              </button>
              {selectedSeller && (
                <span className="text-gray-500">/ {selectedSeller.name}</span>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowOrders(true)}
                className="p-2 text-gray-700 hover:text-green-600 transition-colors duration-200"
                title="My Orders"
                aria-label="View orders"
              >
                <Package className="h-6 w-6" />
              </button>

              <button
                onClick={() => setShowCart(true)}
                className="relative p-2 text-gray-700 hover:text-green-600 transition-colors duration-200"
                aria-label={`Cart, ${cartCount} items`}
              >
                <ShoppingCart className="h-6 w-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>

              <button
                onClick={onShowProfile}
                className="flex items-center space-x-2 text-gray-700 hover:text-green-600 transition-colors duration-200"
                aria-label="View profile"
              >
                <User className="h-5 w-5" />
                <span className="hidden sm:inline">{profile?.full_name}</span>
              </button>

              <button
                onClick={signOut}
                className="p-2 text-gray-700 hover:text-red-600 transition-colors duration-200"
                aria-label="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              placeholder="Search for food, vendors, or cafeterias..."
              className="w-full pl-12 pr-4 py-4 bg-gray-100 border-0 rounded-full focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
              aria-label="Search food or vendors"
            />
          </div>
        </div>

        {selectedSeller && menuItems.length > 0 && (
          <div className="sticky top-20 z-30 bg-gray-50 py-3 mb-6 -mx-4 px-4 border-b border-gray-200">
            <div className="flex flex-col space-y-3">
              <div className="flex overflow-x-auto pb-1 space-x-3 hide-scrollbar">
                {groupedCategories.map(({ category }) => (
                  <button
                    key={category}
                    onClick={() => handleCategoryClick(category)}
                    className={`
                      whitespace-nowrap px-5 py-2 rounded-full text-sm font-medium transition-all duration-200
                      ${pulseCategory === category
                        ? 'bg-black text-white scale-105'
                        : activeCategory === category
                          ? 'bg-black text-white'
                          : 'bg-gray-200 text-gray-800 hover:bg-gray-300 active:scale-95'}
                    `}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* Combined search bar for menu items */}
              <div className="relative">
                <input
                  type="text"
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  placeholder="Search menu items..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-full focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                  aria-label="Search menu items"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              </div>
            </div>
          </div>
        )}

        {!selectedSeller ? (
          <>
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black mb-6">Cafeterias</h2>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredCafeterias.map(cafeteria => {
                    const isSelected = selectedSeller !== null &&
                      selectedSeller.id === cafeteria.id &&
                      selectedSeller.type === 'cafeteria';
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
                        <img
                          src={cafeteria.image_url || getImagePath(cafeteria.id, 'cafeteria')}
                          alt={cafeteria.name}
                          className="w-full h-40 object-cover"
                          onError={(e) => {
                            const target = e.currentTarget;
                            const currentSrc = target.src;

                            // If the current src is not already the fallback, try the fallback
                            if (!currentSrc.includes('placeholder.jpg') && !currentSrc.includes('placehold.co')) {
                              target.src = '/images/placeholder.jpg';
                            } else {
                              // If already showing fallback, try another fallback
                              target.src = 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image';
                            }
                          }}
                        />
                        <div className="p-4">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-bold text-black text-lg">{cafeteria.name}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${isCafeteriaOpen(cafeteria.id) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {isCafeteriaOpen(cafeteria.id) ? 'Open' : 'Closed'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-1">{cafeteria.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black mb-6">Student Vendors</h2>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : filteredVendors.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredVendors.map(vendor => {
                    const isSelected = selectedSeller !== null &&
                      selectedSeller.id === vendor.id &&
                      selectedSeller.type === 'vendor';
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
                        <span className="absolute top-3 right-3 bg-blue-600 text-white text-xs px-3 py-1 rounded-full z-10 font-medium">
                          Student
                        </span>
                        <img
                          src={vendor.image_url || getImagePath(vendor.id, 'vendor')}
                          alt={vendor.store_name}
                          className="w-full h-40 object-cover"
                          onError={(e) => {
                            const target = e.currentTarget;
                            const currentSrc = target.src;

                            // If the current src is not already the fallback, try the fallback
                            if (!currentSrc.includes('placeholder.jpg') && !currentSrc.includes('placehold.co')) {
                              target.src = '/images/placeholder.jpg';
                            } else {
                              // If already showing fallback, try another fallback
                              target.src = 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image';
                            }
                          }}
                        />
                        <div className="p-4">
                          <h3 className="font-bold text-black text-lg">{vendor.store_name}</h3>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-1">{vendor.description}</p>
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

            {lateNightVendor && (
              <section>
                <div className="flex items-center space-x-2 mb-6">
                  <Moon className="h-6 w-6 text-stone-700" />
                  <h2 className="text-2xl font-bold text-stone-800">Late-Night Vendors</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <div
                    key={lateNightVendor.id}
                    onClick={() => handleSellerClick(lateNightVendor.id, 'vendor', lateNightVendor.store_name)}
                    role="button"
                    tabIndex={0}
                    aria-pressed={selectedSeller !== null && selectedSeller.id === lateNightVendor.id}
                    aria-label={`Select ${lateNightVendor.store_name}`}
                    className={`bg-white rounded-2xl border border-stone-200 p-6 cursor-pointer relative transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${selectedSeller !== null && selectedSeller.id === lateNightVendor.id ? 'border-orange-500 bg-orange-50' : 'border-stone-200 hover:border-orange-300'}`}
                  >
                    <span className="absolute top-2 right-2 bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full flex items-center">
                      <Moon className="h-3 w-3 mr-1" /> Late Night
                    </span>
                    <img
                      src={lateNightVendor.image_url || getImagePath(lateNightVendor.id, 'vendor')}
                      alt={lateNightVendor.store_name}
                      className="w-20 h-20 rounded-xl object-cover mb-4"
                      onError={(e) => {
                        const target = e.currentTarget;
                        const currentSrc = target.src;

                        // If the current src is not already the fallback, try the fallback
                        if (!currentSrc.includes('placeholder.jpg') && !currentSrc.includes('placehold.co')) {
                          target.src = '/images/placeholder.jpg';
                        } else {
                          // If already showing fallback, try another fallback
                          target.src = 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image';
                        }
                      }}
                    />
                    <h3 className="font-bold text-stone-800">{lateNightVendor.store_name}</h3>
                    <p className="text-sm text-stone-600 mt-1 line-clamp-2">{lateNightVendor.description}</p>
                  </div>
                </div>
              </section>
            )}
          </>
        ) : (
          <section>
            <button
              onClick={() => setSelectedSeller(null)}
              className="mb-6 text-orange-600 hover:text-orange-700 font-medium transition-colors duration-200"
              aria-label="Go back to vendors"
            >
              ← Back to vendors
            </button>

            {menuItems.length > 0 ? (
              <div>
                {groupedCategories.map(({ category, items }) => (
                  <div
                    key={category}
                    ref={(el) => (categoryRefs.current[category] = el)}
                    className="mb-10"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {items.map(item => (
                        <MenuItemCard
                          key={item.id}
                          item={item}
                          quantity={itemQuantities[item.id] || 0}
                          onQuantityChange={handleQuantityChange}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-stone-500">
                No menu items available
              </div>
            )}
          </section>
        )}
      </div>

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

      {showCart && (
        <Cart
          items={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onClear={handleClearCart}
          onClose={() => setShowCart(false)}
          cartPackCount={cartPackCount}
          onCartPackChange={setCartPackCount}
          onCheckout={() => setShowCheckout(true)}
        />
      )}

      {showCheckout && (
        <Checkout
          items={cart}
          subtotal={subtotal}
          deliveryFee={deliveryFee}
          packCount={cartPackCount}
          onBack={() => setShowCheckout(false)}
          onClose={() => setShowCheckout(false)}
          onSuccess={() => {
            setCart([]);
            setCartPackCount(0);
            setShowCheckout(false);
            showToast('Order placed successfully!');
          }}
        />
      )}

      {showOrders && <OrderTracking onClose={() => setShowOrders(false)} />}
    </div>
  );
};