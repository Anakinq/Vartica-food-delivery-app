// src/components/customer/MenuList.tsx
import React, { useState, useMemo } from 'react';
import { MenuItem } from '../../lib/supabase';
import { MenuItemCardSimple } from '../shared/MenuItemCardSimple';
import { Search, Heart } from 'lucide-react';

interface MenuListProps {
  menuItems: MenuItem[];
  cartItems: Record<string, number>; // e.g. { "item-1": 2, "item-2": 1 }
  onAddToCart: (item: MenuItem) => void;
  onRemoveFromCart: (itemId: string) => void;
}

export const MenuList: React.FC<MenuListProps> = ({
  menuItems,
  cartItems,
  onAddToCart,
  onRemoveFromCart
}) => {
  const [activeTab, setActiveTab] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(menuItems.map(item => item.category).filter(Boolean))
    ) as string[];

    if (unique.length === 0) {
      return ['Meals', 'Sides', 'Snacks'];
    }

    const priority = ['Meals', 'Main Course', 'Sides', 'Snacks', 'Drinks', 'Salad'];
    const sorted = [...priority.filter(cat => unique.includes(cat))];
    const rest = unique.filter(cat => !sorted.includes(cat));
    return [...sorted, ...rest];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    let items = menuItems;

    // Filter by category
    if (activeTab !== 'All') {
      items = items.filter(item => item.category === activeTab);
    }

    // Filter by search
    if (searchQuery) {
      items = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by favorites only
    if (showFavoritesOnly) {
      items = items.filter(item => favorites.includes(item.id));
    }

    return items;
  }, [menuItems, activeTab, searchQuery, favorites, showFavoritesOnly]);

  const toggleFavorite = (itemId: string) => {
    setFavorites(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  return (
    <div className="menu-container bg-[#121212] min-h-screen text-white pb-24">
      {/* Header with Search */}
      <div className="px-4 pt-4 pb-3 sticky top-0 z-10 bg-[#121212]">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Our Menu</h1>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`p-2 rounded-full ${showFavoritesOnly ? 'bg-[#1e1e1e]' : 'bg-[#1e1e1e] text-gray-400'}`}
            >
              <Heart className={`h-5 w-5 ${showFavoritesOnly ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-[#333] rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF9500] focus:border-transparent"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-4 pb-3">
        <div className="flex items-center overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab('All')}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-full mr-3 ${activeTab === 'All'
              ? 'bg-[#FF9500] text-black'
              : 'bg-[#1e1e1e] text-gray-400 hover:bg-[#2a2a2a]'
              }`}
          >
            All
          </button>
          {categories.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-full mr-3 ${activeTab === tab
                ? 'bg-[#FF9500] text-black'
                : 'bg-[#1e1e1e] text-gray-400 hover:bg-[#2a2a2a]'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items List */}
      <div className="px-4">
        {filteredItems.length > 0 ? (
          filteredItems.map(item => (
            <MenuItemCardSimple
              key={item.id}
              item={item}
              quantityInCart={cartItems[item.id] || 0}
              onAdd={() => onAddToCart(item)}
              onRemove={() => onRemoveFromCart(item.id)}
              isFavorite={favorites.includes(item.id)}
              onToggleFavorite={() => toggleFavorite(item.id)}
            />
          ))
        ) : (
          <div className="text-center py-12 text-gray-500">
            {searchQuery ? 'No items found matching your search' : 'No items available'}
          </div>
        )}
      </div>
    </div>
  );
};