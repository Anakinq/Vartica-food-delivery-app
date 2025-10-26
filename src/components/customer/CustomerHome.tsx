import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Search, ShoppingCart, LogOut, User, Moon, Package } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Cafeteria, Vendor, MenuItem } from '../../lib/supabase';
import { MenuItemCard } from './MenuItemCard';
import { Cart } from './Cart';
import { OrderTracking } from './OrderTracking';

interface CartItem extends MenuItem {
  quantity: number;
}

interface CustomerHomeProps {
  onShowProfile?: () => void;
}

// Toast state
interface Toast {
  id: number;
  message: string;
  isVisible: boolean;
}

// Skeleton Card Component
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
  const [selectedSeller, setSelectedSeller] = useState<{ id: string; type: 'cafeteria' | 'vendor'; name: string } | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [pulseCategory, setPulseCategory] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // ✅ Food Pack state
  const [cartPackCount, setCartPackCount] = useState(1);

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

  // ✅ UPDATED: Handle order submission WITH DETAILED ERROR LOGGING
  const handleCheckout = async () => {
    if (cart.length === 0 || !profile) {
      showToast('Cart is empty');
      return;
    }

    if (!selectedSeller) {
      showToast('No seller selected');
      return;
    }

    const deliveryAddress = profile.address || 'Address not provided';
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (isNaN(total) || total <= 0) {
      showToast('Invalid total amount');
      return;
    }

    try {
      // 1. Create the order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: profile.id,
          seller_id: selectedSeller.id,
          seller_type: selectedSeller.type,
          status: 'pending',
          delivery_agent_id: null,
          total,
          delivery_address: deliveryAddress,
          delivery_notes: '',
          payment_status: 'unpaid',
        })
        .select()
        .single();

      if (orderError) {
        console.error('❌ Order creation failed:', {
          message: orderError.message,
          details: orderError.details,
          hint: orderError.hint,
          code: orderError.code,
          raw: orderError
        });
        showToast('Failed to create order. Check console for details.');
        return;
      }

      // 2. Create order items
      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('❌ Order items insertion failed:', {
          message: itemsError.message,
          details: itemsError.details,
          code: itemsError.code,
          raw: itemsError
        });
        // Clean up orphaned order
        await supabase.from('orders').delete().eq('id', orderData.id);
        showToast('Failed to add items to order.');
        return;
      }

      // 3. Initialize Paystack payment
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('init-payment', {
        body: {
          order_id: orderData.id,
          email: profile.email || 'user@example.com',
          amount: Math.round(total * 100), // Convert ₦ to kobo
          callback_url: `https://vartica-nine.vercel.app/payment-success?order_id=${orderData.id}`,
        },
      });

      if (paymentError) {
        console.error('❌ Payment initialization failed:', {
          message: paymentError.message,
          raw: paymentError
        });
        await supabase.from('orders').delete().eq('id', orderData.id);
        showToast('Unable to start payment. Please try again.');
        return;
      }

      // 4. Redirect to Paystack
      window.location.href = paymentData.authorization_url;

    } catch (unexpectedError) {
      console.error('💥 Unexpected error during checkout:', unexpectedError);
      showToast('Something went wrong. Please try again.');
    }
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

    if (cafeteriasRes.data) setCafeterias(cafeteriasRes.data);
    if (vendorsRes.data) {
      const students = vendorsRes.data.filter(v => v.vendor_type === 'student');
      const lateNight = vendorsRes.data.find(v => v.vendor_type === 'late_night');
      setStudentVendors(students);
      if (lateNight) setLateNightVendor(lateNight);
    }
    setLoading(false);
  };

  const fetchMenuItems = async (sellerId: string, sellerType: 'cafeteria' | 'vendor') => {
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('seller_type', sellerType)
      .eq('is_available', true)
      .order('name');

    if (data) setMenuItems(data);
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

  const groupMenuItemsByCategory = () => {
    const categories = ['Main Course', 'Drink','Swallow', 'Protein', 'Side', 'Salad', 'Snack', 'Soup'];
    return categories.map(category => {
      const items = menuItems.filter(item => item.category === category);
      return { category, items };
    }).filter(group => group.items.length > 0);
  };

  const filteredCafeterias = cafeterias.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVendors = studentVendors.filter(v =>
    v.store_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const allSellersInOrder = useMemo(() => {
    const list: Array<{ id: string; type: 'cafeteria' | 'vendor'; name: string }> = [];
    filteredCafeterias.forEach(c => list.push({ id: c.id, type: 'cafeteria', name: c.name }));
    filteredVendors.forEach(v => list.push({ id: v.id, type: 'vendor', name: v.store_name }));
    if (lateNightVendor) list.push({ id: lateNightVendor.id, type: 'vendor', name: lateNightVendor.store_name });
    return list;
  }, [filteredCafeterias, filteredVendors, lateNightVendor]);

  const getImagePath = (sellerId: string, sellerType: 'cafeteria' | 'vendor') => {
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

  const groupedCategories = groupMenuItemsByCategory();

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
    <div className="min-h-screen bg-stone-50">
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSelectedSeller(null)}
                className="text-2xl font-bold text-stone-800 hover:text-orange-600 transition-colors duration-200"
                aria-label="Back to home"
              >
                Vartica
              </button>
              {selectedSeller && (
                <span className="text-stone-400">/ {selectedSeller.name}</span>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowOrders(true)}
                className="p-2 text-stone-600 hover:text-orange-600 transition-colors duration-200"
                title="My Orders"
                aria-label="View orders"
              >
                <Package className="h-6 w-6" />
              </button>

              <button
                onClick={() => setShowCart(true)}
                className="relative p-2 text-stone-600 hover:text-orange-600 transition-colors duration-200"
                aria-label={`Cart, ${cartCount} items`}
              >
                <ShoppingCart className="h-6 w-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>

              <button
                onClick={onShowProfile}
                className="flex items-center space-x-2 text-stone-700 hover:text-orange-600 transition-colors duration-200"
                aria-label="View profile"
              >
                <User className="h-5 w-5" />
                <span className="hidden sm:inline">{profile?.full_name}</span>
              </button>

              <button
                onClick={signOut}
                className="p-2 text-stone-600 hover:text-red-600 transition-colors duration-200"
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
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-stone-400 h-5 w-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for food, vendors, or cafeterias..."
              className="w-full pl-12 pr-4 py-4 border border-stone-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              aria-label="Search food or vendors"
            />
          </div>
        </div>

        {/* Sticky Horizontal Category Bar */}
        {selectedSeller && menuItems.length > 0 && (
          <div className="sticky top-20 z-30 bg-stone-50 py-3 mb-6 -mx-4 px-4 shadow-sm">
            <div className="flex overflow-x-auto pb-1 space-x-3 hide-scrollbar">
              {groupedCategories.map(({ category }) => (
                <button
                  key={category}
                  onClick={() => handleCategoryClick(category)}
                  className={`
                    whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                    ${pulseCategory === category
                      ? 'bg-orange-600 text-white scale-105'
                      : activeCategory === category
                        ? 'bg-orange-500 text-white'
                        : 'bg-stone-200 text-stone-800 hover:bg-stone-300 active:scale-95'}
                  `}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}

        {!selectedSeller ? (
          <>
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-stone-800 mb-6">Cafeterias</h2>
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
                        className={`
                          bg-white rounded-2xl border border-stone-200 p-6 cursor-pointer
                          transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md
                          focus:outline-none focus:ring-2 focus:ring-orange-500
                          ${isSelected 
                            ? 'border-orange-500 bg-orange-50' 
                            : 'border-stone-200 hover:border-orange-300'}
                        `}
                      >
                        <img
                          src={getImagePath(cafeteria.id, 'cafeteria')}
                          alt={cafeteria.name}
                          className="w-20 h-20 rounded-xl object-cover mb-4"
                          onError={(e) => (e.currentTarget.src = '/images/placeholder.jpg')}
                        />
                        <h3 className="font-bold text-stone-800">{cafeteria.name}</h3>
                        <p className="text-sm text-stone-600 mt-1 line-clamp-2">{cafeteria.description}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-stone-800 mb-6">Student Vendors</h2>
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
                        className={`
                          bg-white rounded-2xl border border-stone-200 p-6 cursor-pointer relative
                          transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md
                          focus:outline-none focus:ring-2 focus:ring-orange-500
                          ${isSelected 
                            ? 'border-orange-500 bg-orange-50' 
                            : 'border-stone-200 hover:border-orange-300'}
                        `}
                      >
                        <span className="absolute top-2 right-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          Student Run
                        </span>
                        <img
                          src={getImagePath(vendor.id, 'vendor')}
                          alt={vendor.store_name}
                          className="w-20 h-20 rounded-xl object-cover mb-4"
                          onError={(e) => (e.currentTarget.src = '/images/placeholder.jpg')}
                        />
                        <h3 className="font-bold text-stone-800">{vendor.store_name}</h3>
                        <p className="text-sm text-stone-600 mt-1 line-clamp-2">{vendor.description}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-stone-500">
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
                    className={`
                      bg-white rounded-2xl border border-stone-200 p-6 cursor-pointer relative
                      transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md
                      focus:outline-none focus:ring-2 focus:ring-orange-500
                      ${selectedSeller !== null && selectedSeller.id === lateNightVendor.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-stone-200 hover:border-orange-300'}
                    `}
                  >
                    <span className="absolute top-2 right-2 bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full flex items-center">
                      <Moon className="h-3 w-3 mr-1" /> Late Night
                    </span>
                    <img
                      src={getImagePath(lateNightVendor.id, 'vendor')}
                      alt={lateNightVendor.store_name}
                      className="w-20 h-20 rounded-xl object-cover mb-4"
                      onError={(e) => (e.currentTarget.src = '/images/placeholder.jpg')}
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

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg transform transition-all duration-300 ${
              toast.isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* ✅ Pass onCheckout to Cart */}
      {showCart && (
        <Cart
          items={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onClear={handleClearCart}
          onClose={() => setShowCart(false)}
          cartPackCount={cartPackCount}
          onCartPackChange={setCartPackCount}
          onCheckout={handleCheckout}
        />
      )}

      {showOrders && <OrderTracking onClose={() => setShowOrders(false)} />}
    </div>
  );
};