import React from 'react';
import { Plus, UtensilsCrossed } from 'lucide-react';
import { MenuItem } from '../../lib/supabase';

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, onAddToCart }) => {
  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all overflow-hidden group">
      <div className="aspect-video bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center overflow-hidden relative">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={item.image_url ? 'hidden' : 'flex items-center justify-center'}>
          <UtensilsCrossed className="h-12 w-12 text-orange-600" />
        </div>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
          <span className="text-lg font-bold text-blue-600">#{item.price.toFixed(2)}</span>
        </div>
        {item.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
        )}
        {item.category && (
          <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full mb-3">
            {item.category}
          </span>
        )}
        <button
          onClick={() => onAddToCart(item)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Add to Cart</span>
        </button>
      </div>
    </div>
  );
};
