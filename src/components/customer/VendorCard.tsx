import React from 'react';
import { Store } from 'lucide-react';

interface VendorCardProps {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  onClick: () => void;
}

export const VendorCard: React.FC<VendorCardProps> = ({ name, description, imageUrl, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 text-left w-full group"
    >
      <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg mb-4 flex items-center justify-center overflow-hidden relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              const target = e.currentTarget;
              const currentSrc = target.src;

              // If the current src is not already a fallback, try decoding it first
              if (!currentSrc.includes('placehold.co') && !currentSrc.includes('Store') && !currentSrc.includes('data:')) {
                try {
                  target.src = decodeURIComponent(currentSrc);
                } catch {
                  // If decoding fails, hide the image and show the icon
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }
              } else {
                // If already showing fallback, hide and show the icon
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }
            }}
          />
        ) : null}
        <div className={imageUrl ? 'hidden' : 'flex items-center justify-center'}>
          <Store className="h-12 w-12 text-blue-600" />
        </div>
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
        {name}
      </h3>
      {description && (
        <p className="text-sm text-gray-600 line-clamp-2">{description}</p>
      )}
    </button>
  );
};
