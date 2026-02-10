import React, { memo } from 'react';
import { Store } from 'lucide-react';
import LazyImage from '../common/LazyImage';

interface VendorCardProps {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  onClick: () => void;
}

// Fallback image URL
const FALLBACK_IMAGE = '/images/1.jpg';

export const VendorCard = memo<VendorCardProps>(({ name, description, imageUrl, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-4 sm:p-6 text-left w-full group"
      aria-label={`View ${name} store`}
    >
      <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg mb-4 flex items-center justify-center overflow-hidden relative">
        {imageUrl ? (
          <LazyImage
            src={imageUrl}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            placeholder={imageUrl}
          />
        ) : (
          <div className="flex items-center justify-center">
            <Store className="h-12 w-12 text-blue-600" />
          </div>
        )}
      </div>
      <h3 className="text-mobile-body font-bold text-gray-900 mb-1 sm:mb-2 group-hover:text-blue-600 transition-colors">
        {name}
      </h3>
      {description && (
        <p className="text-sm text-gray-600 line-clamp-2">{description}</p>
      )}
    </button>
  );
});

VendorCard.displayName = 'VendorCard';
