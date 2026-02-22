// src/components/customer/CustomerHome.tsx
// Abuad Delivery Homepage - Following UI Specification
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Search, ArrowLeft, Bell, Home, Package, User, X, Utensils, ShoppingBag, Moon, Bike, Filter } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Cafeteria, MenuItem } from '../../lib/supabase';
import { Vendor } from '../../lib/supabase/types';
import { RoleSwitcher } from '../shared/RoleSwitcher';
import { supabase } from '../../lib/supabase/client';
import { MenuItemCard } from './MenuItemCard';
import { Checkout } from './Checkout';
import { OrderTracking } from './OrderTracking';
import { VendorUpgradeModal } from './VendorUpgradeModal';
import { Skeleton, CardSkeleton } from '../shared/LoadingSkeleton';
import { useToast } from '../../contexts/ToastContext';
import { useCart } from '../../contexts/CartContext';
import { VendorReviewService } from '../../services/supabase/vendor.service';
import { NotificationsPanel } from '../shared/NotificationsPanel';
import { dataCache } from '../../utils/dataCache';
import { measureRenderTime } from '../../utils/performanceMonitoring';
import { CafeteriaSection } from './CafeteriaSection';
import { VendorSection } from './VendorSection';
import { MemoizedSearchAndFilters } from './SearchAndFilters';

interface CustomerHomeProps {
  onShowProfile?: () => void;
}

// Banner interface - maps to database table
interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  link?: string;
  is_active: boolean;
  display_order?: number;
}

// Category interface
interface Category {
  id: string;
  name: string;
  icon: string;
  key: 'cafeterias' | 'vendors' | 'late_night' | 'toast';
}

const COLORS = {
  primary: '#22c55e',     // Green (primary actions)
  accent: '#16a34a',      // Darker green
  secondary: '#f59e0b',   // Orange (accents)
  background: '#0f172a',   // Dark background
  surface: '#1e293b',     // Card surfaces
  textPrimary: '#ffffff',  // White text
  textSecondary: '#cbd5e1', // Light gray text
  textTertiary: '#94a3b8',  // Gray text
};

// Helper function to get time-based greeting
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

export const CustomerHome: React.FC<CustomerHomeProps> = ({ onShowProfile }) => {
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();
  const {
    items: cartItems,
    addItem,
    updateQuantity,
    clearCart,
    cartCount,
    subtotal,
    isCartOpen,
    openCart,
    closeCart,
    cartPackCount,
    setCartPackCount
  } = useCart();

  // State
  const [cafeterias, setCafeterias] = useState<Cafeteria[]>([]);
  const [studentVendors, setStudentVendors] = useState<Vendor[]>([]);
  const [lateNightVendors, setLateNightVendors] = useState<Vendor[]>([]);
  const [vendorRatings, setVendorRatings] = useState<Record<string, { avgRating: number; reviewCount: number }>>({});
  const [banners, setBanners] = useState<Banner[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(() => {
    // Use profile's hostel_location if available, otherwise default
    const profileWithHostel = profile as any;
    return profileWithHostel?.hostel_location || 'ABUAD Campus – Hostel B';
  });
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  const [cafeteriaStatus, setCafeteriaStatus] = useState<Record<string, boolean>>({});
  const [selectedSeller, setSelectedSeller] = useState<{ id: string; type: 'cafeteria' | 'vendor' | 'late_night_vendor'; name: string } | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [showOrders, setShowOrders] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [pulseCategory, setPulseCategory] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showVendorUpgrade, setShowVendorUpgrade] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Carousel state
  const [currentBanner, setCurrentBanner] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Categories definition
  const categories: Category[] = [
    { id: '1', name: 'Cafeterias', icon: 'Utensils', key: 'cafeterias' },
    { id: '2', name: 'Vendors', icon: 'ShoppingBag', key: 'vendors' },
    { id: '3', name: 'Late Night', icon: 'Moon', key: 'late_night' },
    { id: '4', name: 'Toast', icon: 'Bike', key: 'toast' },
  ];

  const [activeTab, setActiveTab] = useState<'cafeterias' | 'vendors' | 'late_night' | 'toast'>('cafeterias');
  const [showFilters, setShowFilters] = useState(false);
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('popular');

  // Location options
  const locations = [
    'ABUAD Campus – Hostel B',
    'ABUAD Campus – Hostel A',
    'ABUAD Campus – Hostel C',
    'ABUAD Campus – Staff Quarters',
    'ABUAD Main Gate',
  ];

  // Update selected location when profile loads
  useEffect(() => {
    const profileWithHostel = profile as any;
    if (profileWithHostel?.hostel_location) {
      setSelectedLocation(profileWithHostel.hostel_location);
    }
  }, [profile]);

  // Auto-slide carousel
  useEffect(() => {
    const interval = setInterval(() => {
      if (banners.length > 1) {
        setCurrentBanner((prev) => (prev + 1) % banners.length);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [banners.length]);

  // Group menu items by category
  const groupMenuItemsByCategory = (itemsToGroup: MenuItem[] = menuItems) => {
    const uniqueCategories = Array.from(new Set(itemsToGroup.map(item => item.category).filter(Boolean) as string[]));
    const priorityCategories = [
      'Main Food', 'Protein', 'Swallow', 'Soup', 'Other',
      'Rice & Pasta', 'Proteins & Sides', 'Drinks', 'Meals', 'Main Course', 'Sides', 'Snacks', 'Salad'
    ];
    const sortedCategories = [
      ...priorityCategories.filter(cat => uniqueCategories.includes(cat)),
      ...uniqueCategories.filter(cat => !priorityCategories.includes(cat))
    ];

    return sortedCategories.map(category => {
      const items = itemsToGroup.filter(item => item.category === category);
      return { category, items };
    }).filter(group => group.items.length > 0);
  };

  // Filter menu items based on search and favorites
  const sellerFilteredMenuItems = useMemo(() => {
    let items = menuItems;
    if (globalSearchQuery.trim()) {
      items = items.filter(item =>
        item.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(globalSearchQuery.toLowerCase()))
      );
    }
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

  // Handle scroll for category highlighting
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
      // Check cache first
      const cachedBanners = dataCache.get('banners');
      const cachedCafeterias = dataCache.get('cafeterias');
      const cachedVendors = dataCache.get('vendors');

      // Fetch banners from database or cache
      let bannersData = cachedBanners;
      if (!bannersData) {
        const { data: bannersResult, error: bannersError } = await supabase
          .from('banners')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (!bannersError && bannersResult && bannersResult.length > 0) {
          bannersData = bannersResult;
          dataCache.set('banners', bannersResult, 600000); // 10 minutes cache
        }
      }

      if (bannersData) {
        setBanners(bannersData);
      } else {
        // Fallback to mock data if no banners in database
        const mockBanners: Banner[] = [
          {
            id: '1',
            title: '20% Off Today!',
            subtitle: 'Main Cafeteria Promo',
            image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
            is_active: true,
          },
          {
            id: '2',
            title: 'Free Delivery',
            subtitle: 'On orders above ₦2000',
            image_url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800',
            is_active: true,
          },
          {
            id: '3',
            title: 'Late Night Specials',
            subtitle: 'Order now for midnight snacks',
            image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
            is_active: true,
          },
        ];
        setBanners(mockBanners);
      }

      // Fetch cafeterias and vendors in parallel with caching
      const [cafeteriasRes, vendorsRes] = await Promise.all([
        cachedCafeterias
          ? Promise.resolve({ data: cachedCafeterias, error: null })
          : supabase.from('cafeterias').select('*').eq('is_active', true).order('name'),
        cachedVendors
          ? Promise.resolve({ data: cachedVendors, error: null })
          : supabase.from('vendors').select('*').eq('is_active', true).order('store_name'),
      ]);

      if (cafeteriasRes.error) {
        console.error('Error fetching cafeterias:', cafeteriasRes.error);
      } else if (cafeteriasRes.data) {
        const cafeteriasData = cafeteriasRes.data;
        if (!cachedCafeterias) {
          dataCache.set('cafeterias', cafeteriasData, 300000); // 5 minutes cache
        }
        setCafeterias(cafeteriasData);
        const initialStatus: Record<string, boolean> = {};
        cafeteriasData.forEach((cafeteria: Cafeteria) => {
          initialStatus[cafeteria.id] = true;
        });
        setCafeteriaStatus(initialStatus);
      }

      if (vendorsRes.error) {
        console.error('Error fetching vendors:', vendorsRes.error);
      } else if (vendorsRes.data) {
        const vendorsData = vendorsRes.data;
        if (!cachedVendors) {
          dataCache.set('vendors', vendorsData, 300000); // 5 minutes cache
        }

        const students = vendorsData.filter(v => v.vendor_type === 'student');
        const lateNight = vendorsData.filter(v => v.vendor_type === 'late_night');
        setStudentVendors(students);
        setLateNightVendors(lateNight);

        const allVendors = [...students, ...lateNight];
        const ratings: Record<string, { avgRating: number; reviewCount: number }> = {};

        // Batch rating fetches for better performance
        const ratingPromises = allVendors.map(async (vendor) => {
          try {
            const [avgRating, reviewCount] = await Promise.all([
              VendorReviewService.getVendorAverageRating(vendor.id),
              VendorReviewService.getVendorReviewCount(vendor.id)
            ]);
            return { vendorId: vendor.id, rating: { avgRating, reviewCount } };
          } catch (error) {
            return { vendorId: vendor.id, rating: { avgRating: 0, reviewCount: 0 } };
          }
        });

        const ratingResults = await Promise.all(ratingPromises);
        ratingResults.forEach(({ vendorId, rating }) => {
          ratings[vendorId] = rating;
        });

        setVendorRatings(ratings);
      }
    } catch (error) {
      console.error('Unexpected error in fetchData:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async (sellerId: string, sellerType: 'cafeteria' | 'vendor' | 'late_night_vendor') => {
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
      setMenuItems(data || []);
    }
  };

  const handleSellerClick = async (id: string, type: 'cafeteria' | 'vendor' | 'late_night_vendor', name: string) => {
    setSelectedSeller({ id, type, name });
    await fetchMenuItems(id, type);
  };

  // Filter and sort vendors
  const getFilteredAndSortedCafeterias = useMemo(() => {
    let result = [...cafeterias];

    // Apply search filter
    if (globalSearchQuery.trim()) {
      result = result.filter(c => c.name.toLowerCase().includes(globalSearchQuery.toLowerCase()));
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        // popular - keep default order
        break;
    }

    return result;
  }, [cafeterias, globalSearchQuery, sortBy]);

  const filteredCafeterias = useMemo(() => {
    return getFilteredAndSortedCafeterias;
  }, [getFilteredAndSortedCafeterias]);

  const filteredVendors = useMemo(() => {
    let result = [...studentVendors];

    if (globalSearchQuery.trim()) {
      result = result.filter(v => v.store_name.toLowerCase().includes(globalSearchQuery.toLowerCase()));
    }

    // Filter by rating
    if (ratingFilter !== 'all') {
      const minRating = parseFloat(ratingFilter);
      result = result.filter(v => {
        const rating = vendorRatings[v.id];
        return rating && rating.avgRating >= minRating;
      });
    }

    return result;
  }, [studentVendors, globalSearchQuery, ratingFilter, vendorRatings]);

  const deliveryFee = 500;

  const getImagePath = (sellerId: string, sellerType: 'cafeteria' | 'vendor', sellerName?: string) => {
    const isLateNightVendor = lateNightVendors.some(v => v.id === sellerId);
    if (isLateNightVendor && sellerType === 'vendor') {
      return '/images/latenightvendor.jpg';
    }

    if (sellerType === 'cafeteria' && sellerName) {
      const nameMap: Record<string, string> = {
        'Cafeteria 1': 'caf 1',
        'Cafeteria 2': 'caf 2',
        'Med Cafeteria': 'med caf',
        'Smoothie Shack': 'smoothie shack',
        'Staff Cafeteria': 'staff caf',
        'Captain Cook': 'captain cook'
      };
      const mappedName = nameMap[sellerName];
      if (mappedName) {
        const extensionMap: Record<string, string> = {
          'caf 1': '.png',
          'caf 2': '.png',
          'staff caf': '.png',
          'captain cook': '.png',
          'med caf': '.jpeg',
          'smoothie shack': '.png'
        };
        const ext = extensionMap[mappedName] || '.jpg';
        return `/images/${mappedName}${ext}`;
      }
    }

    if (sellerType === 'cafeteria') {
      const index = cafeterias.findIndex(c => c.id === sellerId);
      if (index !== -1) {
        return `/images/${index + 1}.jpg`;
      }
    }

    if (sellerType === 'vendor') {
      const index = studentVendors.findIndex(v => v.id === sellerId);
      if (index !== -1) {
        const cafeteriaCount = cafeterias.length;
        return `/images/${cafeteriaCount + index + 1}.jpg`;
      }
    }

    return '/images/1.jpg';
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

  // Filter menu items based on search
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
    if (newQuantity < oldQuantity) {
      updateQuantity(itemId, newQuantity);
      return;
    }
    if (newQuantity === oldQuantity + 1) {
      addItem(item);
    }
  };

  // Render carousel dots
  const renderCarouselDots = () => {
    if (banners.length <= 1) return null;
    return (
      <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentBanner(index)}
            className={`w-2 h-2 rounded-full transition-all ${index === currentBanner ? 'bg-white w-6' : 'bg-white/50'
              }`}
          />
        ))}
      </div>
    );
  };

  // Render category tab with Lucide icons
  const renderCategoryTab = (category: Category) => {
    const isActive = activeTab === category.key;

    // Map icon names to Lucide components
    const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
      Utensils,
      ShoppingBag,
      Moon,
      Bike,
    };

    const IconComponent = iconMap[category.icon] || Utensils;

    return (
      <button
        key={category.id}
        onClick={() => {
          setActiveTab(category.key);
          setPulseCategory(category.key);
          setTimeout(() => setPulseCategory(null), 300);
        }}
        className={`flex flex-col items-center justify-center min-w-[72px] px-3 py-2 rounded-xl transition-all duration-200 ${isActive
          ? 'bg-green-500 shadow-lg shadow-green-500/30'
          : 'bg-slate-800 hover:bg-slate-700'
          }`}
      >
        <div className={`p-1.5 rounded-lg mb-1 ${isActive ? 'bg-green-400/20' : 'bg-slate-700'}`}>
          <IconComponent className={`w-5 h-5 ${isActive ? 'text-green-400' : 'text-slate-400'}`} />
        </div>
        <span className={`text-xs font-medium ${isActive ? 'text-green-400' : 'text-slate-400'}`}>
          {category.name}
        </span>
      </button>
    );
  };

  // Render cafeteria card
  const renderCafeteriaCard = (cafeteria: Cafeteria) => {
    const isOpen = cafeteriaStatus[cafeteria.id] !== false;
    return (
      <div
        key={cafeteria.id}
        onClick={() => handleSellerClick(cafeteria.id, 'cafeteria', cafeteria.name)}
        className="bg-slate-800 rounded-xl overflow-hidden shadow-md border border-slate-700 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-green-500/10 hover:border-green-500/30"
      >
        <div className="relative h-20">
          <LazyImage
            src={cafeteria.image_url || getImagePath(cafeteria.id, 'cafeteria', cafeteria.name)}
            alt={cafeteria.name}
            className="w-full h-full object-cover"
            placeholder="https://placehold.co/600x400/1e293b/64748b?text=No+Image"
          />
          <div className="absolute top-2 right-2">
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${isOpen ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
              {isOpen ? 'Open' : 'Closed'}
            </span>
          </div>
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-slate-100 text-sm truncate mb-1">{cafeteria.name}</h3>
          <div className="flex items-center text-xs text-slate-400 mb-2">
            <MapPin className="w-3.5 h-3.5 mr-1" />
            <span className="truncate">Central Campus</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-700">
            <div className="flex items-center">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="ml-1 text-xs font-medium text-slate-200">4.5</span>
              <span className="ml-1 text-xs text-slate-500">(187)</span>
            </div>
            <div className="flex items-center text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5 mr-1" />
              <span>20-25 min</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render vendor card
  const renderVendorCard = (vendor: Vendor, isLateNight: boolean = false) => {
    const rating = vendorRatings[vendor.id];
    return (
      <div
        key={vendor.id}
        onClick={() => handleSellerClick(vendor.id, 'vendor', vendor.store_name)}
        className="bg-slate-800 rounded-xl overflow-hidden shadow-md border border-slate-700 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-green-500/10 hover:border-green-500/30"
      >
        <div className="relative h-20">
          <LazyImage
            src={vendor.image_url || getImagePath(vendor.id, 'vendor')}
            alt={vendor.store_name}
            className="w-full h-full object-cover"
            placeholder="https://placehold.co/600x400/1e293b/64748b?text=No+Image"
          />
          {isLateNight && (
            <div className="absolute top-2 left-2">
              <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-1 rounded-full flex items-center border border-purple-500/30">
                <Moon className="w-3 h-3 mr-1" /> Late Night
              </span>
            </div>
          )}
          {/* Verified badge - vendors are always considered verified */}
          {(vendor.vendor_type === 'student' || vendor.vendor_type === 'late_night') && (
            <div className="absolute top-2 right-2">
              <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full font-medium border border-blue-500/30">
                ✓ Verified
              </span>
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-slate-100 text-sm truncate mb-1">{vendor.store_name}</h3>
          <p className="text-xs text-slate-400 line-clamp-1 mb-2">{vendor.description || 'Student Vendor'}</p>
          <div className="flex items-center justify-between pt-2 border-t border-slate-700">
            {rating && rating.reviewCount > 0 ? (
              <div className="flex items-center">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="ml-1 text-xs font-medium text-slate-200">{rating.avgRating.toFixed(1)}</span>
                <span className="ml-1 text-xs text-slate-500">({rating.reviewCount})</span>
              </div>
            ) : (
              <div className="text-xs text-slate-400">Be the first to review!</div>
            )}
            {isLateNight && (
              <div className="text-xs text-purple-400 font-medium">
                9pm - 2am
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Bottom navigation handler
  const handleNavClick = (tab: string) => {
    switch (tab) {
      case 'home':
        // Already on home
        break;
      case 'orders':
        setShowOrders(true);
        break;
      case 'notifications':
        setShowNotifications(true);
        break;
      case 'profile':
        onShowProfile?.();
        break;
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-900">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Header Section */}
        <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
          <div className="px-4 pt-4">
            {/* Greeting and Quick Actions Row */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-slate-400">{getGreeting()},</p>
                <h1 className="text-xl font-bold text-slate-100">
                  {profile?.full_name || 'Student'}
                </h1>
              </div>
              <div className="flex items-center space-x-3">
                {/* Role Switcher - Show only for users with multiple roles */}
                <div className="relative">
                  <RoleSwitcher variant="compact" />
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <MemoizedSearchAndFilters
            searchQuery={globalSearchQuery}
            onSearchChange={setGlobalSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
            ratingFilter={ratingFilter}
            onRatingChange={setRatingFilter}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            placeholder={selectedSeller ? "Search menu items..." : "Search for food, vendors..."}
          />
        </header>

        {/* Main Content */}
        <main className="bg-slate-900">
          {!selectedSeller ? (
            <>
              {/* Announcement Carousel (Hero) */}
              {banners.length > 0 && (
                <section className="mb-8">
                  <div
                    ref={carouselRef}
                    className="relative h-52 sm:h-60 mx-4 rounded-3xl overflow-hidden shadow-xl shadow-black/30"
                  >
                    {banners.map((banner, index) => (
                      <div
                        key={banner.id}
                        className={`absolute inset-0 transition-opacity duration-500 ${index === currentBanner ? 'opacity-100' : 'opacity-0'
                          }`}
                      >
                        <img
                          src={banner.image_url}
                          alt={banner.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30 flex flex-col justify-center px-8">
                          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{banner.title}</h2>
                          {banner.subtitle && (
                            <p className="text-white/80 text-base">{banner.subtitle}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {renderCarouselDots()}
                  </div>
                </section>
              )}

              {/* Category Section */}
              <section className="mb-6 px-4">
                <div className="flex space-x-2 overflow-x-auto hide-scrollbar pb-2">
                  {categories.map(renderCategoryTab)}
                </div>
              </section>

              {/* Cafeterias Section - Show only when Cafeterias tab is active */}
              {activeTab === 'cafeterias' && (
                <>
                  <CafeteriaSection
                    cafeterias={cafeterias}
                    cafeteriaStatus={cafeteriaStatus}
                    onCafeteriaClick={(id, name) => handleSellerClick(id, 'cafeteria', name)}
                    globalSearchQuery={globalSearchQuery}
                    sortBy={sortBy}
                  />

                  {/* Late Night Vendors Section - Show only when Cafeterias tab is active */}
                  {lateNightVendors.length > 0 && (
                    <VendorSection
                      vendors={lateNightVendors}
                      vendorRatings={vendorRatings}
                      onVendorClick={(id, name) => handleSellerClick(id, 'vendor', name)}
                      globalSearchQuery={globalSearchQuery}
                      ratingFilter={ratingFilter}
                      title="Late Night Vendors"
                      showLateNightBadge={true}
                    />
                  )}
                </>
              )}

              {/* Trusted Vendors Section - Show only when Vendors tab is active */}
              {activeTab === 'vendors' && studentVendors.length > 0 && (
                <VendorSection
                  vendors={studentVendors}
                  vendorRatings={vendorRatings}
                  onVendorClick={(id, name) => handleSellerClick(id, 'vendor', name)}
                  globalSearchQuery={globalSearchQuery}
                  ratingFilter={ratingFilter}
                  title="Trusted Campus Vendors"
                  seeAllLink="#/vendors"
                />
              )}

              {/* Late Night Tab - Show late night vendors only */}
              {activeTab === 'late_night' && lateNightVendors.length > 0 && (
                <VendorSection
                  vendors={lateNightVendors}
                  vendorRatings={vendorRatings}
                  onVendorClick={(id, name) => handleSellerClick(id, 'vendor', name)}
                  globalSearchQuery={globalSearchQuery}
                  ratingFilter={ratingFilter}
                  title="Late Night Vendors"
                  showLateNightBadge={true}
                />
              )}

              {/* Toast Tab - Show toast content */}
              {activeTab === 'toast' && (
                <section className="mb-10 px-4">
                  <div className="flex items-center space-x-2 mb-5">
                    <Bike className="w-5 h-5 text-green-400" />
                    <h2 className="text-xl font-bold text-white">Toast Services</h2>
                  </div>
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                      <Bike className="w-10 h-10 text-gray-600" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Toast Feature Coming Soon</h3>
                    <p className="text-gray-400">We're working on bringing you toast-related services</p>
                  </div>
                </section>
              )}
            </>
          ) : (
            /* Seller Detail View */
            <section className="px-4 pt-2">
              {/* Back button and seller info */}
              <div className="flex items-center mb-4">
                <button
                  onClick={() => {
                    setSelectedSeller(null);
                    setMenuItems([]);
                    setGlobalSearchQuery('');
                  }}
                  className="flex items-center space-x-2 text-gray-300 hover:text-green-400 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="font-medium">Back</span>
                </button>
              </div>

              {/* Category filter tabs */}
              {sellerFilteredMenuItems.length > 0 && (
                <div className="sticky top-0 bg-[#121212] py-3 -mx-4 px-4 border-b border-gray-800 mb-4 z-30">
                  <div className="flex overflow-x-auto space-x-2 hide-scrollbar">
                    {groupedSellerCategories.map(({ category }) => (
                      <button
                        key={category}
                        onClick={() => handleCategoryClick(category)}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${pulseCategory === category
                          ? 'bg-green-500 text-white'
                          : activeCategory === category
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                          }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Menu items by category */}
              {groupedCategories.map(({ category, items }) => (
                <div
                  key={category}
                  ref={(el) => { categoryRefs.current[category] = el; }}
                  className="mb-8"
                >
                  <h2 className="text-lg font-bold text-white mb-4">{category}</h2>
                  <div className="grid grid-cols-2 gap-4">
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

              {sellerFilteredMenuItems.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                    <Search className="w-10 h-10 text-gray-600" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {globalSearchQuery ? 'No items found' : 'No items available'}
                  </h3>
                  <p className="text-gray-400">
                    {globalSearchQuery ? 'Try adjusting your search or filters' : 'Check back later for new items'}
                  </p>
                  {globalSearchQuery && (
                    <button
                      onClick={() => setGlobalSearchQuery('')}
                      className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg font-medium"
                    >
                      Clear Search
                    </button>
                  )}
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      {/* Notifications Panel */}
      {showNotifications && (
        <NotificationsPanel onClose={() => setShowNotifications(false)} />
      )}

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
            toast.showToast('Order placed successfully!');
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
            toast.showToast('Application successfully submitted!');
            try {
              await refreshProfile();
            } catch (error) {
              console.error('Error refreshing profile:', error);
            }
          }}
        />
      )}

      {/* Bottom Navigation - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-50">
        <div className="flex justify-around items-center h-16 safe-area-bottom">
          <button
            onClick={() => handleNavClick('home')}
            className="flex flex-col items-center justify-center flex-1 py-2"
          >
            <Home className="w-6 h-6 text-green-400" />
            <span className="text-xs text-green-400 mt-1">Home</span>
          </button>
          <button
            onClick={() => handleNavClick('orders')}
            className="flex flex-col items-center justify-center flex-1 py-2"
          >
            <Package className="w-6 h-6 text-slate-400" />
            <span className="text-xs text-slate-400 mt-1">Orders</span>
          </button>
          <button
            onClick={() => handleNavClick('notifications')}
            className="flex flex-col items-center justify-center flex-1 py-2 relative"
          >
            <Bell className="w-6 h-6 text-slate-400" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
            <span className="text-xs text-slate-400 mt-1">Alerts</span>
          </button>
          <button
            onClick={() => handleNavClick('profile')}
            className="flex flex-col items-center justify-center flex-1 py-2"
          >
            <User className="w-6 h-6 text-slate-400" />
            <span className="text-xs text-slate-400 mt-1">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerHome;
