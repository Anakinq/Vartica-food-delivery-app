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
  onShowProfile?: () => void; // 👈 Added prop
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

  // Group menu items by your custom categories
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

  const filteredMenuItems = menuItems.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSelectedSeller(null)}
                className="text-2xl font-bold text-gray-900 hover:text-blue-600"
              >
                Vartica
              </button>
              {selectedSeller && (
                <span className="text-gray-400">/ {selectedSeller.name}</span>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowOrders(true)}
                className="p-2 text-gray-600 hover:text-blue-600"
                title="My Orders"
              >
                <Package className="h-6 w-6" />
              </button>

              <button
                onClick={() => setShowCart(true)}
                className="relative p-2 text-gray-600 hover:text-blue-600"
              >
                <ShoppingCart className="h-6 w-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* 👇 Updated: Profile button */}
              <button
                onClick={onShowProfile}
                className="flex items-center space-x-2 text-gray-700 hover:text-blue-600"
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
              className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    <VendorCard
                      key={cafeteria.id}
                      name={cafeteria.name}
                      description={cafeteria.description}
                      imageUrl={cafeteria.image_url}
                      onClick={() => handleSellerClick(cafeteria.id, 'cafeteria', cafeteria.name)}
                    />
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
                    <VendorCard
                      key={vendor.id}
                      name={vendor.store_name}
                      description={vendor.description}
                      imageUrl={vendor.image_url}
                      onClick={() => handleSellerClick(vendor.id, 'vendor', vendor.store_name)}
                    />
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
                  <VendorCard
                    name={lateNightVendor.store_name}
                    description={lateNightVendor.description}
                    imageUrl={lateNightVendor.image_url}
                    onClick={() => handleSellerClick(lateNightVendor.id, 'vendor', lateNightVendor.store_name)}
                  />
                </div>
              </section>
            )}
          </>
        ) : (
          <section>
            <button
              onClick={() => setSelectedSeller(null)}
              className="mb-6 text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to vendors
            </button>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Menu</h2>
            
            {/* Category Grouping */}
            {menuItems.length > 0 ? (
              <div>
                {groupMenuItemsByCategory().map(({ category, items }) => (
                  <div key={category} className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                      {category === 'Main Course' && '🍽️'}
                      {category === 'Swallow' && '🥣'}
                      {category === 'Protein' && '🍗'}
                      {category === 'Side' && '🥗'}
                      {category === 'Drink' && '🥤'}
                      {category === 'Salad' && '🥗'}
                      {category === 'Snack' && '🍪'}
                      {category === 'Soup' && '🍜'}
                      <span className="ml-2">{category}</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {items.map(item => (
                        <MenuItemCard
                          key={item.id}
                          item={item}
                          onAddToCart={handleAddToCart}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No menu items available
              </div>
            )}
          </section>
        )}
      </div>

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