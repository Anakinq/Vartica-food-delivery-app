// src/components/customer/CustomerHome.tsx
import React, { useEffect, useState } from 'react';
import { Search, ShoppingCart, LogOut, User, Moon, Package } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Cafeteria, Vendor, MenuItem } from '../../lib/supabase';
import { VendorCard } from './VendorCard';
import { MenuItemCard } from './MenuItemCard';
import { Cart } from './Cart';
import { OrderTracking } from './OrderTracking';

interface CartItem extends MenuItem {
  quantity: number;
}

interface CustomerHomeProps {
  onShowProfile?: () => void;
}

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

  useEffect(() => {
    fetchData();
  }, []);

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
    setActiveCategory(null); // Reset filter
    await fetchMenuItems(id, type);
  };

  const handleAddToCart = (item: MenuItem) => {
    if (cart.length > 0 && (cart[0].seller_id !== item.seller_id || cart[0].seller_type !== item.seller_type)) {
      if (!confirm('Adding items from a different vendor will clear your current cart. Continue?')) {
        return;
      }
      setCart([{ ...item, quantity: 1 }]);
    } else {
      const existing = cart.find(i => i.id === item.id);
      if (existing) {
        setCart(cart.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      } else {
        setCart([...cart, { ...item, quantity: 1 }]);
      }
    }
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

  const handleBackToVendors = () => {
    setSelectedSeller(null);
    setActiveCategory(null);
    setMenuItems([]);
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

  // Filter items by active category
  const filteredItems = activeCategory
    ? menuItems.filter(item => item.category === activeCategory)
    : menuItems;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-teal-50">
      <nav className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToVendors}
                className="text-2xl font-bold text-gray-900 hover:text-orange-600"
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
                className="p-2 text-gray-600 hover:text-orange-600"
                title="My Orders"
              >
                <Package className="h-6 w-6" />
              </button>

              <button
                onClick={() => setShowCart(true)}
                className="relative p-2 text-gray-600 hover:text-orange-600"
              >
                <ShoppingCart className="h-6 w-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>

              <button
                onClick={onShowProfile}
                className="flex items-center space-x-2 text-gray-700 hover:text-orange-600"
              >
                <User className="h-5 w-5" />
                <span className="hidden sm:inline">{profile?.full_name}</span>
              </button>

              <button
                onClick={signOut}
                className="p-2 text-gray-600 hover:text-red-600"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for food, vendors, or cafeterias..."
              className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent shadow-sm"
            />
          </div>
        </div>

        {!selectedSeller ? (
          <>
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Cafeterias</h2>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredCafeterias.map(cafeteria => (
                    <button
                      key={cafeteria.id}
                      onClick={() => handleSellerClick(cafeteria.id, 'cafeteria', cafeteria.name)}
                      className={`bg-white rounded-xl shadow-md overflow-hidden p-4 text-left transition-all hover:shadow-lg ${
                        selectedSeller?.id === cafeteria.id ? 'ring-2 ring-orange-500' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-md flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                            <polyline points="9 22 9 12 15 12 15 22"></polyline>
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{cafeteria.name}</h3>
                          <p className="text-sm text-gray-600">{cafeteria.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Student Vendors</h2>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : filteredVendors.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredVendors.map(vendor => (
                    <button
                      key={vendor.id}
                      onClick={() => handleSellerClick(vendor.id, 'vendor', vendor.store_name)}
                      className={`bg-white rounded-xl shadow-md overflow-hidden p-4 text-left transition-all hover:shadow-lg ${
                        selectedSeller?.id === vendor.id ? 'ring-2 ring-orange-500' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-md flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                            <polyline points="9 22 9 12 15 12 15 22"></polyline>
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{vendor.store_name}</h3>
                          <p className="text-sm text-gray-600">{vendor.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
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
                  <Moon className="h-6 w-6 text-gray-700" />
                  <h2 className="text-2xl font-bold text-gray-900">Late-Night Vendors</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <button
                    key={lateNightVendor.id}
                    onClick={() => handleSellerClick(lateNightVendor.id, 'vendor', lateNightVendor.store_name)}
                    className={`bg-white rounded-xl shadow-md overflow-hidden p-4 text-left transition-all hover:shadow-lg ${
                      selectedSeller?.id === lateNightVendor.id ? 'ring-2 ring-orange-500' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-md flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                          <polyline points="9 22 9 12 15 12 15 22"></polyline>
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{lateNightVendor.store_name}</h3>
                        <p className="text-sm text-gray-600">{lateNightVendor.description}</p>
                      </div>
                    </div>
                  </button>
                </div>
              </section>
            )}
          </>
        ) : (
          <section>
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={handleBackToVendors}
                className="text-orange-600 hover:text-orange-700 font-medium flex items-center"
              >
                ← Back to vendors
              </button>
              <h2 className="text-2xl font-bold text-gray-900">{selectedSeller.name} Menu</h2>
            </div>

            {/* Category Filter Bar */}
            <div className="flex space-x-2 overflow-x-auto pb-2 mb-6">
              {['Main Course', 'Drink','Swallow', 'Protein', 'Side', 'Salad', 'Snack', 'Soup'].map(category => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                    activeCategory === category
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Render filtered items */}
            {filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map(item => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No items in this category
              </div>
            )}
          </section>
        )}
      </div>

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 bg-orange-500 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg z-50 hover:bg-orange-600 transition-all"
        >
          <span className="font-bold text-lg">{cartCount}</span>
        </button>
      )}

      {showCart && (
        <Cart
          items={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onClear={handleClearCart}
          onClose={() => setShowCart(false)}
        />
      )}

      {showOrders && <OrderTracking onClose={() => setShowOrders(false)} />}
    </div>
  );
};