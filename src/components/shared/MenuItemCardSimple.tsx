// src/components/shared/MenuItemCardSimple.tsx
import React, { useState } from 'react';
import { MenuItem } from '../../lib/supabase';
import LazyImage from '../common/LazyImage';
import { Plus, Minus, Heart } from 'lucide-react';

// Fallback image
const FALLBACK_IMAGE = '/images/1.jpg';

const getImageUrl = (imageUrl: string | null | undefined): string => {
  if (!imageUrl) return FALLBACK_IMAGE;
  try {
    if (imageUrl.startsWith('http')) {
      return decodeURIComponent(imageUrl);
    }
    return imageUrl;
  } catch (error) {
    console.warn('Error processing image URL:', error);
    return FALLBACK_IMAGE;
  }
};

interface MenuItemCardSimpleProps {
  item: MenuItem;
  quantityInCart: number;
  onAdd: () => void;
  onRemove: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export const MenuItemCardSimple: React.FC<MenuItemCardSimpleProps> = ({
  item,
  quantityInCart,
  onAdd,
  onRemove,
  isFavorite = false,
  onToggleFavorite
}) => {
  const [isAnimating, setIsAnimating] = useState<'increment' | 'decrement' | null>(null);
  const imageUrl = getImageUrl(item.image_url);

  const handleIncrement = () => {
    setIsAnimating('increment');
    onAdd();
    setTimeout(() => setIsAnimating(null), 200);
  };

  const handleDecrement = () => {
    if (quantityInCart > 0) {
      setIsAnimating('decrement');
      onRemove();
      setTimeout(() => setIsAnimating(null), 200);
    }
  };

  const totalPrice = item.price * quantityInCart;

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-3 sm:p-4 mb-2 sm:mb-3 flex items-center">
      {/* Food Image */}
      <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-[#2a2a2a] mr-4 flex-shrink-0">
        <LazyImage
          src={imageUrl}
          alt={item.name}
          className="w-full h-full object-cover"
          fallback="/images/1.jpg"
        />

        {/* Quantity Badge */}
        {quantityInCart > 0 && (
          <div className="absolute top-2 right-2 bg-[#FF9500] text-black px-2 py-1 rounded-full text-xs font-bold">
            {quantityInCart}
          </div>
        )}
      </div>

      {/* Food Details */}
      <div className="flex-1">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-bold text-white text-base sm:text-lg line-clamp-1">{item.name}</h3>
          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              className="text-gray-400 hover:text-red-500 p-1"
            >
              <Heart className={`h-5 w-5 ${isFavorite ? 'text-red-500 fill-red-500' : ''}`} />
            </button>
          )}
        </div>

        {/* Description */}
        {item.description && (
          <p className="text-gray-400 text-sm line-clamp-2 mb-2">
            {item.description}
          </p>
        )}

        {/* Price & Quantity Controls */}
        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center">
            <button
              onClick={handleDecrement}
              disabled={quantityInCart === 0}
              className={`w-8 h-8 rounded-full bg-[#2d2d2d] flex items-center justify-center ${quantityInCart === 0
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-white hover:bg-[#3a3a3a]'
                }`}
            >
              <Minus className="h-4 w-4" />
            </button>

            <span
              className={`mx-2 text-white font-bold min-w-[24px] text-center transition-transform duration-200 ${isAnimating ? 'scale-125 text-[#FF9500]' : ''
                }`}
            >
              {quantityInCart}
            </span>

            <button
              onClick={handleIncrement}
              className="w-8 h-8 rounded-full bg-[#FF9500] text-black flex items-center justify-center hover:bg-[#FFA534] transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <span className="font-bold text-white text-lg">
            ₦{item.price.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};