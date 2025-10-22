// src/components/shared/MenuItemCardSimple.tsx
import React, { useState } from 'react';
import { MenuItem } from '../../lib/supabase';

interface MenuItemCardSimpleProps {
  item: MenuItem;
  quantityInCart: number;
  onAdd: () => void;
  onRemove: () => void;
}

export const MenuItemCardSimple: React.FC<MenuItemCardSimpleProps> = ({ 
  item, 
  quantityInCart, 
  onAdd, 
  onRemove 
}) => {
  const [isFavorite, setIsFavorite] = useState(false);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  const imageUrl = item.image_url || 'https://placehold.co/400x400/e2e8f0/64748b?text=No+Image';

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="relative w-full pt-[100%]">
        <img
          src={imageUrl}
          alt={item.name}
          className="absolute inset-0 w-full h-full object-cover rounded-t-xl"
          onError={(e) => {
  (e.target as HTMLImageElement).src = '/images/food-placeholder.png';
}}
        />
        <button
          onClick={toggleFavorite}
          className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-full backdrop-blur-sm z-10"
        >
          {isFavorite ? (
            <span className="text-red-500 text-lg">❤️</span>
          ) : (
            <span className="text-gray-400 text-lg">🤍</span>
          )}
        </button>
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">{item.name}</h3>
        <p className="text-blue-600 font-bold mt-1">
          ₦{item.price.toLocaleString()}
        </p>

        {/* Cart Controls */}
        <div className="flex items-center mt-2">
          {quantityInCart === 0 ? (
            <button
              onClick={onAdd}
              className="flex-1 bg-blue-600 text-white text-sm font-medium py-1.5 rounded-lg hover:bg-blue-700"
            >
              Add
            </button>
          ) : (
            <div className="flex items-center border border-gray-300 rounded-lg">
              <button
                onClick={onRemove}
                className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-l-lg"
              >
                -
              </button>
              <span className="w-8 text-center font-medium">{quantityInCart}</span>
              <button
                onClick={onAdd}
                className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-r-lg"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};