import React, { useState, memo, useCallback } from 'react';
import { MenuItem } from '../../lib/supabase';
import LazyImage from '../common/LazyImage';
import { Plus, Minus, Heart } from 'lucide-react';

interface MenuItemCardProps {
  item: MenuItem;
  quantity: number;
  onQuantityChange: (itemId: string, newQuantity: number) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

// Fallback image URL
const FALLBACK_IMAGE = '/images/1.jpg';

// Properly format the image URL to handle special characters and ensure validity
const getImageUrl = (imageUrl: string | null | undefined): string => {
  if (!imageUrl) return FALLBACK_IMAGE;

  try {
    // Check if it's already a full URL
    if (imageUrl.startsWith('http')) {
      return decodeURIComponent(imageUrl);
    }
    return imageUrl;
  } catch {
    return FALLBACK_IMAGE;
  }
};

export const MenuItemCard = memo<MenuItemCardProps>(({ item, quantity, onQuantityChange, isFavorite = false, onToggleFavorite }) => {
  const imageUrl = getImageUrl(item.image_url);

  const handleIncrement = useCallback(() => {
    onQuantityChange(item.id, quantity + 1);
  }, [item.id, quantity, onQuantityChange]);

  const handleDecrement = useCallback(() => {
    if (quantity > 0) {
      onQuantityChange(item.id, quantity - 1);
    }
  }, [item.id, quantity, onQuantityChange]);

  const handleToggleFavorite = useCallback(() => {
    onToggleFavorite?.();
  }, [onToggleFavorite]);

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-3 sm:p-4 mb-2 sm:mb-3 flex items-center">
      {/* Product Image */}
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-[#2a2a2a] mr-3 sm:mr-4 flex-shrink-0">
        <LazyImage
          src={imageUrl}
          alt={item.name}
          className="w-full h-full object-cover"
          fallback={FALLBACK_IMAGE}
        />

        {/* Quantity Badge */}
        {quantity > 0 && (
          <div className="absolute top-2 right-2 bg-[#FF9500] text-black px-2 py-1 rounded-full text-xs font-bold">
            {quantity}
          </div>
        )}
      </div>

      {/* Food Details */}
      <div className="flex-1">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-bold text-white text-base sm:text-lg line-clamp-1">{item.name}</h3>
          {onToggleFavorite && (
            <button
              onClick={handleToggleFavorite}
              className="text-gray-400 hover:text-red-500 p-1"
              aria-label={isFavorite ? `Remove ${item.name} from favorites` : `Add ${item.name} to favorites`}
              aria-pressed={isFavorite}
            >
              <Heart className={`h-5 w-5 ${isFavorite ? 'text-red-500 fill-red-500' : ''}`} />
            </button>
          )}
        </div>

        {/* Description */}
        {item.description && (
          <p className="text-gray-300 text-sm line-clamp-2 mb-2">
            {item.description}
          </p>
        )}

        {/* Price & Quantity Controls */}
        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center">
            <button
              onClick={handleDecrement}
              disabled={quantity === 0}
              className={`w-8 h-8 rounded-full bg-[#2d2d2d] flex items-center justify-center ${quantity === 0
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-white hover:bg-[#3a3a3a]'
                }`}
              aria-label={`Decrease ${item.name} quantity`}
            >
              <Minus className="h-4 w-4" />
            </button>

            <span className="mx-2 text-white font-bold min-w-[24px] text-center">
              {quantity}
            </span>

            <button
              onClick={handleIncrement}
              className="w-8 h-8 rounded-full bg-[#FF9500] text-black flex items-center justify-center hover:bg-[#FFA534] transition-colors"
              aria-label={`Increase ${item.name} quantity`}
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
});

MenuItemCard.displayName = 'MenuItemCard';
