import React, { useState, memo, useCallback } from 'react';
import { MenuItem } from '../../lib/supabase';
import { LazyImage } from '../common/LazyImage';
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

  const handleQuickAdd = useCallback(() => {
    if (quantity === 0) {
      onQuantityChange(item.id, 1);
    }
  }, [item.id, quantity, onQuantityChange]);

  return (
    <div className="bg-slate-800 rounded-xl p-4 mb-3 border border-slate-700 hover:border-green-500/30 transition-all duration-200">
      <div className="flex items-start gap-4">
        {/* Product Image */}
        <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
          <LazyImage
            src={imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
            placeholder={FALLBACK_IMAGE}
          />

          {/* Quick Add Button */}
          {quantity === 0 && (
            <button
              onClick={handleQuickAdd}
              className="absolute inset-0 bg-black/50 hover:bg-black/70 flex items-center justify-center transition-all"
              aria-label={`Add ${item.name} to cart`}
            >
              <Plus className="h-6 w-6 text-white" />
            </button>
          )}

          {/* Quantity Badge */}
          {quantity > 0 && (
            <div className="absolute -top-2 -right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold min-w-[24px] text-center">
              {quantity}
            </div>
          )}
        </div>

        {/* Food Details */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-slate-100 text-base line-clamp-1">{item.name}</h3>
            {onToggleFavorite && (
              <button
                onClick={handleToggleFavorite}
                className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                aria-label={isFavorite ? `Remove ${item.name} from favorites` : `Add ${item.name} to favorites`}
                aria-pressed={isFavorite}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? 'text-red-500 fill-red-500' : ''}`} />
              </button>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-slate-400 text-sm line-clamp-1 mb-3">
              {item.description}
            </p>
          )}

          {/* Price & Quantity Controls */}
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-100 text-lg">
              ₦{item.price.toLocaleString()}
            </span>

            {quantity > 0 && (
              <div className="flex items-center bg-slate-700 rounded-lg p-1">
                <button
                  onClick={handleDecrement}
                  className="w-7 h-7 rounded-md bg-slate-600 flex items-center justify-center text-slate-300 hover:bg-slate-500 transition-colors"
                  aria-label={`Decrease ${item.name} quantity`}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>

                <span className="mx-2 text-slate-100 font-medium min-w-[20px] text-center text-sm">
                  {quantity}
                </span>

                <button
                  onClick={handleIncrement}
                  className="w-7 h-7 rounded-md bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-colors"
                  aria-label={`Increase ${item.name} quantity`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

MenuItemCard.displayName = 'MenuItemCard';
