import { render, screen, fireEvent } from '@testing-library/react';
import { LazyImage } from '../LazyImage';

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null
});
window.IntersectionObserver = mockIntersectionObserver;

describe('LazyImage', () => {
    const mockSrc = 'https://example.com/image.jpg';
    const mockAlt = 'Test image';

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset IntersectionObserver mock
        mockIntersectionObserver.mockClear();
        mockIntersectionObserver.mockReturnValue({
            observe: () => null,
            unobserve: () => null,
            disconnect: () => null
        });
    });

    it('renders with correct attributes', () => {
        render(
            <LazyImage
                src={mockSrc}
                alt={mockAlt}
                className="test-class"
            />
        );

        // Check that container exists
        const container = document.querySelector('.lazy-image-container');
        expect(container).toBeInTheDocument();
        expect(container).toHaveClass('test-class');
    });

    it('loads image when in viewport', () => {
        render(<LazyImage src={mockSrc} alt={mockAlt} />);

        // Simulate intersection
        const observerCallback = mockIntersectionObserver.mock.calls[0][0];
        const container = document.querySelector('.lazy-image-container');
        observerCallback([{ isIntersecting: true, target: container }]);

        // Now the image should be rendered
        const img = screen.getByAltText(mockAlt);
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', mockSrc);
    });

    it('shows placeholder when loading', () => {
        render(
            <LazyImage
                src={mockSrc}
                alt={mockAlt}
                placeholder="https://example.com/placeholder.jpg"
            />
        );

        // Initially shows loading spinner
        expect(document.querySelector('.lazy-image-placeholder')).toBeInTheDocument();
    });

    it('handles image load error', () => {
        render(<LazyImage src={mockSrc} alt={mockAlt} />);

        // Simulate intersection first
        const observerCallback = mockIntersectionObserver.mock.calls[0][0];
        const container = document.querySelector('.lazy-image-container');
        observerCallback([{ isIntersecting: true, target: container }]);

        // Now get the image and simulate error
        const img = screen.getByAltText(mockAlt);
        fireEvent.error(img);

        // Should show error state
        expect(screen.getByText('Image unavailable')).toBeInTheDocument();
    });

    it('applies aspect ratio styling', () => {
        render(
            <LazyImage
                src={mockSrc}
                alt={mockAlt}
                aspectRatio="1/1"
            />
        );

        const container = document.querySelector('.lazy-image-container');
        expect(container).toHaveStyle({ aspectRatio: '1/1' });
    });

    it('uses priority loading when specified', () => {
        render(
            <LazyImage
                src={mockSrc}
                alt={mockAlt}
                priority={true}
            />
        );

        // With priority, image should be rendered immediately
        const img = screen.getByAltText(mockAlt);
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', mockSrc);
    });
});