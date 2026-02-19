import React, { useState, useEffect } from 'react';
import { ArrowLeft, Star, MapPin, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Cafeteria } from '../../lib/supabase';
import { supabase } from '../../lib/supabase/client';
import { LazyImage } from '../common/LazyImage';
import { CardSkeleton } from '../shared/LoadingSkeleton';

interface CafeteriaListProps {
    onBack: () => void;
}

export const CafeteriaList: React.FC<CafeteriaListProps> = ({ onBack }) => {
    const { profile } = useAuth();
    const [cafeterias, setCafeterias] = useState<Cafeteria[]>([]);
    const [loading, setLoading] = useState(true);
    const [cafeteriaStatus, setCafeteriaStatus] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const fetchCafeterias = async () => {
            try {
                const { data, error } = await supabase
                    .from('cafeterias')
                    .select('*')
                    .eq('is_active', true)
                    .order('name');

                if (error) throw error;

                if (data) {
                    setCafeterias(data);

                    // Set initial status for each cafeteria
                    const initialStatus: Record<string, boolean> = {};
                    data.forEach(cafeteria => {
                        initialStatus[cafeteria.id] = true; // Assuming all active cafeterias are open
                    });
                    setCafeteriaStatus(initialStatus);
                }
            } catch (error) {
                console.error('Error fetching cafeterias:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCafeterias();
    }, []);

    const getImagePath = (cafeteriaId: string, cafeteriaName?: string) => {
        if (cafeteriaName) {
            const nameMap: Record<string, string> = {
                'Cafeteria 1': 'caf 1',
                'Cafeteria 2': 'caf 2',
                'Med Cafeteria': 'med caf',
                'Smoothie Shack': 'smoothie shack',
                'Staff Cafeteria': 'staff caf',
                'Captain Cook': 'captain cook'
            };
            const mappedName = nameMap[cafeteriaName];
            if (mappedName) {
                const extensionMap: Record<string, string> = {
                    'caf 1': '.png',
                    'caf 2': '.png',
                    'staff caf': '.png',
                    'captain cook': '.png',
                    'med caf': '.jpeg',
                    'smoothie shack': '.png'
                };
                const ext = extensionMap[mappedName] || '.jpg';
                return `/images/${mappedName}${ext}`;
            }
        }

        const index = cafeterias.findIndex(c => c.id === cafeteriaId);
        if (index !== -1) {
            return `/images/${index + 1}.jpg`;
        }

        return '/images/1.jpg';
    };

    const renderCafeteriaCard = (cafeteria: Cafeteria) => {
        const isOpen = cafeteriaStatus[cafeteria.id] !== false;
        return (
            <div
                key={cafeteria.id}
                onClick={() => window.location.hash = `#/cafeteria/${cafeteria.id}`}
                className="bg-gray-800 rounded-2xl overflow-hidden shadow-lg shadow-black/20 border border-gray-700 cursor-pointer transition-all duration-200 hover:shadow-xl hover:shadow-green-500/10 hover:border-green-500/50"
            >
                <div className="relative h-24">
                    <LazyImage
                        src={cafeteria.image_url || getImagePath(cafeteria.id, cafeteria.name)}
                        alt={cafeteria.name}
                        className="w-full h-full object-cover"
                        placeholder="https://placehold.co/600x400/1e293b/64748b?text=No+Image"
                    />
                    <div className="absolute top-3 right-3">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${isOpen ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                            {isOpen ? 'Open' : 'Closed'}
                        </span>
                    </div>
                </div>
                <div className="p-3">
                    <h3 className="font-bold text-white text-base truncate">{cafeteria.name}</h3>
                    <div className="flex items-center text-sm text-gray-400 mt-2">
                        <MapPin className="w-4 h-4 mr-1.5" />
                        <span className="truncate">Central Campus</span>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700">
                        <div className="flex items-center">
                            <Star className="w-5 h-5 text-yellow-400 fill-current" />
                            <span className="ml-1.5 text-sm font-semibold text-white">4.5</span>
                            <span className="ml-1.5 text-xs text-gray-500">(187)</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-400">
                            <Clock className="w-4 h-4 mr-1.5" />
                            <span>20-25 min</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-[#121212]">
            {/* Header */}
            <header className="bg-[#121212] border-b border-gray-800 sticky top-0 z-40">
                <div className="px-4 pt-4">
                    <div className="flex items-center mb-4">
                        <button
                            onClick={onBack}
                            className="flex items-center space-x-2 text-gray-300 hover:text-green-400 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span className="font-medium">Back</span>
                        </button>
                    </div>
                    <h1 className="text-2xl font-bold text-white">All Cafeterias</h1>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pb-16 pt-4">
                {loading ? (
                    <div className="grid grid-cols-1 gap-4 px-4">
                        {[...Array(6)].map((_, index) => (
                            <div key={index} className="bg-gray-800 rounded-2xl p-4">
                                <CardSkeleton />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4">
                        {cafeterias.map(cafeteria => (
                            <div key={cafeteria.id}>
                                {renderCafeteriaCard(cafeteria)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CafeteriaList;