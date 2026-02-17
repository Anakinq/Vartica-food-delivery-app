import React, { memo } from 'react';
import { Store, UtensilsCrossed } from 'lucide-react';
import { LazyImage } from '../common/LazyImage';

interface VendorCardProps {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  onClick: () => void;
}

// Fallback image URL - dark theme compatible
const FALLBACK_IMAGE = 'https://placehold.co/600x400/1e293b/64748b?text=No+Image';

export const VendorCard = memo<VendorCardProps>(({ name, description, imageUrl, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all p-4 sm:p-6 text-left w-full group border border-gray-700 hover:border-green-500/50"
      aria-label={`View ${name} store`}
    >
      <div className="aspect-video bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg mb-4 flex items-center justify-center overflow-hidden relative">
        {imageUrl ? (
          <LazyImage
            src={imageUrl}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            placeholder={FALLBACK_IMAGE}
          />
        ) : (
          <div className="flex items-center justify-center">
            <UtensilsCrossed className="h-12 w-12 text-gray-500" />
          </div>
        )}
      </div>
      <h3 className="text-mobile-body font-bold text-white mb-1 sm:mb-2 group-hover:text-green-400 transition-colors">
        {name}
      </h3>
      {description && (
        <p className="text-sm text-gray-400 line-clamp-2">{description}</p>
      )}
    </button>
  );
});

VendorCard.displayName = 'VendorCard';
