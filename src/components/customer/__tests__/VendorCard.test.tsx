import { render, screen, fireEvent } from '@testing-library/react';
import { VendorCard } from '../VendorCard';
import { vi } from 'vitest';

// Mock the LazyImage component
vi.mock('../LazyImage', () => ({
    LazyImage: ({ alt, className }: { alt: string; className: string }) => (
        <img src="test-image.jpg" alt={alt} className={className} />
    )
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    UtensilsCrossed: () => <div data-testid="utensils-icon" />,
    Star: () => <div data-testid="star-icon" />
}));

describe('VendorCard', () => {
    const mockVendor = {
        id: '1',
        name: 'Test Vendor',
        description: 'Test description',
        image_url: 'https://example.com/image.jpg',
        rating: 4.5,
        delivery_time: '30-45 min',
        delivery_fee: 500
    };

    const mockOnSelect = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders vendor information correctly', () => {
        render(
            <VendorCard
                vendor={mockVendor}
                onSelect={mockOnSelect}
            />
        );

        expect(screen.getByText('Test Vendor')).toBeInTheDocument();
        expect(screen.getByText('Test description')).toBeInTheDocument();
        expect(screen.getByText('4.5')).toBeInTheDocument();
        expect(screen.getByText('30-45 min')).toBeInTheDocument();
        expect(screen.getByText('₦500')).toBeInTheDocument();
    });

    it('calls onSelect when clicked', () => {
        render(
            <VendorCard
                vendor={mockVendor}
                onSelect={mockOnSelect}
            />
        );

        const card = screen.getByRole('button');
        fireEvent.click(card);

        expect(mockOnSelect).toHaveBeenCalledWith(mockVendor);
        expect(mockOnSelect).toHaveBeenCalledTimes(1);
    });

    it('renders placeholder when no image provided', () => {
        const vendorWithoutImage = {
            ...mockVendor,
            image_url: null
        };

        render(
            <VendorCard
                vendor={vendorWithoutImage}
                onSelect={mockOnSelect}
            />
        );

        expect(screen.getByTestId('utensils-icon')).toBeInTheDocument();
    });

    it('applies correct styling classes', () => {
        render(
            <VendorCard
                vendor={mockVendor}
                onSelect={mockOnSelect}
            />
        );

        const card = screen.getByRole('button');
        expect(card).toHaveClass('bg-slate-800', 'hover:bg-slate-700');
    });

    it('displays delivery time and fee correctly', () => {
        render(
            <VendorCard
                vendor={mockVendor}
                onSelect={mockOnSelect}
            />
        );

        expect(screen.getByText('30-45 min')).toBeInTheDocument();
        expect(screen.getByText('₦500')).toBeInTheDocument();
    });

    it('handles vendor without description', () => {
        const vendorWithoutDescription = {
            ...mockVendor,
            description: null
        };

        render(
            <VendorCard
                vendor={vendorWithoutDescription}
                onSelect={mockOnSelect}
            />
        );

        expect(screen.queryByText('Test description')).not.toBeInTheDocument();
        expect(screen.getByText('Test Vendor')).toBeInTheDocument();
    });
});