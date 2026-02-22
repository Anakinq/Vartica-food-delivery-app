import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { databaseService } from '../../services';

interface DeliveryAgentRatingProps {
    deliveryAgentId: string;
    orderId: string;
    initialRating?: number;
    onRatingSubmit?: (rating: number) => void;
}

export const DeliveryAgentRating: React.FC<DeliveryAgentRatingProps> = ({
    deliveryAgentId,
    orderId,
    initialRating = 0,
    onRatingSubmit
}) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [rating, setRating] = useState<number>(initialRating);
    const [hover, setHover] = useState<number>(0);
    const [hasRated, setHasRated] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);

    // Check if user has already rated this delivery agent for this order
    useEffect(() => {
        const checkIfRated = async () => {
            if (!user?.id || !deliveryAgentId || !orderId) return;

            const { data, error } = await databaseService.select<{
                id: string;
                customer_id: string;
                delivery_agent_id: string;
                order_id: string;
                rating: number;
                review?: string;
                created_at?: string;
            }>({
                table: 'delivery_ratings',
                match: {
                    customer_id: user.id,
                    delivery_agent_id: deliveryAgentId,
                    order_id: orderId
                }
            });

            if (error) {
                console.error('Error checking rating:', error);
                return;
            }

            if (data && data.length > 0) {
                setHasRated(true);
                setRating(data[0].rating);
            }
        };

        checkIfRated();
    }, [user?.id, deliveryAgentId, orderId]);

    const handleRating = async (rate: number) => {
        if (!user?.id || hasRated || loading) return;

        setLoading(true);

        try {
            const { error } = await databaseService.insert<{
                customer_id: string;
                delivery_agent_id: string;
                order_id: string;
                rating: number;
                review?: string;
            }>({
                table: 'delivery_ratings',
                data: {
                    customer_id: user.id,
                    delivery_agent_id: deliveryAgentId,
                    order_id: orderId,
                    rating: rate,
                    review: '' // Could be expanded to include text reviews
                }
            });

            if (error) {
                console.error('Error submitting rating:', error);
                showToast('Failed to submit rating. Please try again.', 'error');
                return;
            }

            setRating(rate);
            setHasRated(true);
            if (onRatingSubmit) {
                onRatingSubmit(rate);
            }
        } catch (err) {
            console.error('Error submitting rating:', err);
            showToast('Failed to submit rating. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="py-4">
            <h4 className="font-medium text-gray-900 mb-2">Rate Delivery Agent</h4>
            <div className="flex items-center">
                {[...Array(5)].map((_, index) => {
                    const ratingValue = index + 1;
                    return (
                        <button
                            key={ratingValue}
                            type="button"
                            onClick={() => handleRating(ratingValue)}
                            onMouseEnter={() => setHover(ratingValue)}
                            onMouseLeave={() => setHover(0)}
                            disabled={hasRated || loading || !user}
                            className={`${index !== 4 ? 'mr-1' : ''} ${hasRated || !user ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                            <Star
                                className={`w-6 h-6 ${ratingValue <= (hover || rating)
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                    } ${(!hasRated && user) ? 'hover:text-yellow-300' : ''}`}
                            />
                        </button>
                    );
                })}
                <span className="ml-2 text-gray-600">
                    {hasRated ? `Rated: ${rating}/5` : user ? 'Click to rate' : 'Sign in to rate'}
                </span>
            </div>
            {loading && <p className="text-sm text-gray-500 mt-1">Submitting rating...</p>}
            {hasRated && <p className="text-sm text-green-600 mt-1">Thank you for your rating!</p>}
        </div>
    );
};