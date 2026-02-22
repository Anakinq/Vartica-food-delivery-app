import { render, screen, fireEvent } from '@testing-library/react';
import { VendorCard } from '../VendorCard';

// Mock the LazyImage component
jest.mock('../../common/LazyImage', () => ({
    LazyImage: ({ alt, className }: { alt: string; className: string }) => (
        <img src="test-image.jpg" alt={alt} className={className} />
    )
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
    UtensilsCrossed: () => <div data-testid="utensils-icon" />
}));

describe('VendorCard', () => {
    const mockVendor = {
        name: 'Test Vendor',
        description: 'Test description',
        imageUrl: 'https://example.com/image.jpg'
    };

    const mockOnClick = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders vendor information correctly', () => {
        render(
            <VendorCard
                name={mockVendor.name}
                description={mockVendor.description}
                imageUrl={mockVendor.imageUrl}
                onClick={mockOnClick}
            />
        );

        expect(screen.getByText('Test Vendor')).toBeInTheDocument();
        expect(screen.getByText('Test description')).toBeInTheDocument();
    });

    it('calls onClick when clicked', () => {
        render(
            <VendorCard
                name={mockVendor.name}
                description={mockVendor.description}
                imageUrl={mockVendor.imageUrl}
                onClick={mockOnClick}
            />
        );

        const card = screen.getByRole('button');
        fireEvent.click(card);

        expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('renders placeholder when no image provided', () => {
        render(
            <VendorCard
                name={mockVendor.name}
                description={mockVendor.description}
                imageUrl={null}
                onClick={mockOnClick}
            />
        );

        expect(screen.getByTestId('utensils-icon')).toBeInTheDocument();
    });

    it('applies correct styling classes', () => {
        render(
            <VendorCard
                name={mockVendor.name}
                description={mockVendor.description}
                imageUrl={mockVendor.imageUrl}
                onClick={mockOnClick}
            />
        );

        const card = screen.getByRole('button');
        expect(card).toHaveClass('bg-gray-800', 'hover:shadow-xl');
    });

    it('handles vendor without description', () => {
        render(
            <VendorCard
                name={mockVendor.name}
                description={null}
                imageUrl={mockVendor.imageUrl}
                onClick={mockOnClick}
            />
        );

        expect(screen.queryByText('Test description')).not.toBeInTheDocument();
        expect(screen.getByText('Test Vendor')).toBeInTheDocument();
    });
});