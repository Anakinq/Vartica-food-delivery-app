// src/components/customer/MenuList.tsx
import React, { useMemo } from 'react';
import { MenuItem } from '../../lib/supabase';
import { MenuItemCardSimple } from '../shared/MenuItemCardSimple';

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
    if (activeTab === 'All') return menuItems;
    return menuItems.filter(item => item.category === activeTab);
  }, [menuItems, activeTab]);

  return (
    <div className="pb-20">
      <div className="flex justify-between items-center px-4 pt-4">
        <h1 className="text-2xl font-bold text-gray-900">Our Menu</h1>
        <div className="relative">
          <span className="text-xl">🛒</span>
        </div>
      </div>

      <div className="flex items-center px-4 mt-4 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveTab('All')}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-full mr-3 ${
            activeTab === 'All'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          All
        </button>
        {categories.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-full mr-3 ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 p-4">
        {filteredItems.length > 0 ? (
          filteredItems.map(item => (
            <MenuItemCardSimple
              key={item.id}
              item={item}
              quantityInCart={cartItems[item.id] || 0}
              onAdd={() => onAddToCart(item)}
              onRemove={() => onRemoveFromCart(item.id)}
            />
          ))
        ) : (
          <div className="col-span-2 text-center py-8 text-gray-500">
            No items available
          </div>
        )}
      </div>
    </div>
  );
};