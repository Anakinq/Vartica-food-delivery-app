import React from 'react';

interface TopContainerProps {
    children: React.ReactNode;
}

/**
 * TopContainer - Global Layout Wrapper
 * 
 * This component wraps ALL pages in the app to ensure:
 * - Consistent mobile responsiveness
 * - No horizontal overflow
 * - Proper spacing across all pages
 * - Stable bottom navigation behavior
 * - Uniform layout structure
 * 
 * Core Styling Rules (MANDATORY):
 * - width: 100%
 * - max-width: 100vw
 * - overflow-x: hidden (prevent horizontal scrolling bugs)
 * - min-height: 100vh
 * - display: flex
 * - flex-direction: column
 */
export const TopContainer: React.FC<TopContainerProps> = ({ children }) => {
    return (
        <div
            className="top-container"
            style={{
                width: '100%',
                maxWidth: '100vw',
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                overflowX: 'hidden',
                boxSizing: 'border-box',
                margin: 0,
                padding: 0,
            }}
        >
            {children}
        </div>
    );
};

interface MainContentProps {
    children: React.ReactNode;
    className?: string;
}

/**
 * MainContent - Content Area Component
 * 
 * This component contains the main page content and:
 * - Takes up remaining space using flex: 1
 * - Is scrollable if content overflows vertically
 * - Has consistent horizontal padding
 * - NEVER causes horizontal overflow
 * - Adds padding-bottom to prevent overlap with bottom navigation
 */
export const MainContent: React.FC<MainContentProps> = ({ children, className = '' }) => {
    return (
        <main
            className={`main-content ${className}`}
            style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                paddingBottom: '80px',
                maxWidth: '100%',
                width: '100%',
                margin: 0,
                boxSizing: 'border-box',
                paddingLeft: 0,
                paddingRight: 0,
            }}
        >
            {children}
        </main>
    );
};

interface LayoutWrapperProps {
    children: React.ReactNode;
    showBottomNavigation?: boolean;
    bottomNavigation?: React.ReactNode;
}

/**
 * LayoutWrapper - Complete Layout with Bottom Navigation
 * 
 * This is the complete layout wrapper that includes:
 * - TopContainer as the outer wrapper
 * - MainContent for the page content
 * - Optional BottomNavigation
 * 
 * This is the recommended component to use for all authenticated pages.
 */
export const LayoutWrapper: React.FC<LayoutWrapperProps> = ({
    children,
    showBottomNavigation = true,
    bottomNavigation
}) => {
    return (
        <TopContainer>
            <MainContent>
                {children}
            </MainContent>
            {showBottomNavigation && bottomNavigation && (
                <div style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 50,
                }}>
                    {bottomNavigation}
                </div>
            )}
        </TopContainer>
    );
};

export default TopContainer;

