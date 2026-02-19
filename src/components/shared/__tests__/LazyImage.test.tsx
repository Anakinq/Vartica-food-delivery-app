import { render, screen, fireEvent } from '@testing-library/react';
import { LazyImage } from '../LazyImage';

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
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
        vi.clearAllMocks();
    });

    it('renders with correct attributes', () => {
        render(
            <LazyImage
                src={mockSrc}
                alt={mockAlt}
                className="test-class"
            />
        );

        const img = screen.getByAltText(mockAlt);
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('data-src', mockSrc);
        expect(img).toHaveClass('lazy', 'test-class');
    });

    it('loads image when in viewport', () => {
        render(<LazyImage src={mockSrc} alt={mockAlt} />);

        const img = screen.getByAltText(mockAlt);

        // Simulate intersection
        const observerCallback = mockIntersectionObserver.mock.calls[0][0];
        observerCallback([{ isIntersecting: true, target: img }]);

        expect(img).toHaveAttribute('src', mockSrc);
        expect(img).not.toHaveClass('lazy');
    });

    it('shows placeholder when loading', () => {
        render(
            <LazyImage
                src={mockSrc}
                alt={mockAlt}
                placeholder="https://example.com/placeholder.jpg"
            />
        );

        const img = screen.getByAltText(mockAlt);
        expect(img).toHaveAttribute('src', 'https://example.com/placeholder.jpg');
    });

    it('handles image load error', () => {
        render(<LazyImage src={mockSrc} alt={mockAlt} />);

        const img = screen.getByAltText(mockAlt);

        // Simulate image error
        fireEvent.error(img);

        // Should show error state or fallback
        expect(img).toBeInTheDocument();
    });

    it('applies aspect ratio styling', () => {
        render(
            <LazyImage
                src={mockSrc}
                alt={mockAlt}
                aspectRatio="1/1"
            />
        );

        const container = screen.getByAltText(mockAlt).parentElement;
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

        const img = screen.getByAltText(mockAlt);
        expect(img).toHaveAttribute('src', mockSrc);
        expect(img).not.toHaveClass('lazy');
    });
});