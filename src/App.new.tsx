// src/App.tsx - React Router Implementation with Improved Role Management
import React, { useState, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useRole } from './contexts/RoleContext';

// Lazy loaded components
const CustomerHome = React.lazy(() => import('./components/customer/CustomerHome'));
const VendorDashboard = React.lazy(() => import('./components/vendor/VendorDashboard'));
const DeliveryDashboard = React.lazy(() => import('./components/delivery/DeliveryDashboard'));
const CafeteriaDashboard = React.lazy(() => import('./components/cafeteria/CafeteriaDashboard'));
const AdminDashboard = React.lazy(() => import('./components/admin/AdminDashboard'));
const AuthCallback = React.lazy(() => import('./components/auth/AuthCallback'));
const Checkout = React.lazy(() => import('./components/shared/Checkout'));
const NotificationsPanel = React.lazy(() => import('./components/shared/NotificationsPanel'));
const ProfileDashboard = React.lazy(() => import('./components/shared/ProfileDashboard'));
const LandingPage = React.lazy(() => import('./components/LandingPage'));
const SignIn = React.lazy(() => import('./components/auth/SignIn'));
const SignUp = React.lazy(() => import('./components/auth/SignUp'));

// Components that are not lazy loaded
import { BottomNavigation } from './components/shared/BottomNavigation';
import { VendorBottomNavigation } from './components/vendor/VendorBottomNavigation';
import { PageLoader } from './components/shared/PageLoader';
import { RoleSwitcher } from './components/shared/RoleSwitcher';

// Loading wrapper for lazy components
const withSuspense = <P extends object>(Component: React.ComponentType<P>) => {
    return function SuspendedComponent(props: P) {
        return (
            <Suspense fallback={<PageLoader />}>
                <Component {...props} />
            </Suspense>
        );
    };
};

// Protected Route Component
const ProtectedRoute: React.FC<{
    children: React.ReactNode;
    requiredRole?: string;
}> = ({ children, requiredRole }) => {
    const { user, profile, loading } = useAuth();
    const { currentRole } = useRole();

    if (loading) {
        return <PageLoader />;
    }

    if (!user || !profile) {
        return <Navigate to="/auth" replace />;
    }

    // Check role requirements if specified
    if (requiredRole && currentRole !== requiredRole) {
        // Redirect to appropriate dashboard based on current role
        switch (currentRole) {
            case 'vendor':
                return <Navigate to="/vendor" replace />;
            case 'delivery_agent':
                return <Navigate to="/delivery" replace />;
            default:
                return <Navigate to="/" replace />;
        }
    }

    return <>{children}</>;
};

// Auth Route Component
const AuthRoute: React.FC<{
    children: React.ReactNode;
}> = ({ children }) => {
    const { user, profile, loading } = useAuth();

    if (loading) {
        return <PageLoader />;
    }

    if (user && profile) {
        // Redirect authenticated users to their dashboard
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

// Main App Component
function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}

// App Content Component
function AppContent() {
    const { user, profile, loading, signOut } = useAuth();
    const { currentRole } = useRole();
    const [showProfile, setShowProfile] = useState(false);
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [authView, setAuthView] = useState<'signin' | 'signup'>('signin');

    if (loading) {
        return <PageLoader />;
    }

    // Handle unauthenticated users
    if (!user || !profile) {
        // Show role selection if no role selected
        if (!selectedRole) {
            return (
                <Suspense fallback={<PageLoader />}>
                    <LandingPage
                        onRoleSelect={(role, signup) => {
                            setSelectedRole(role);
                            setAuthView(signup ? 'signup' : 'signin');
                        }}
                    />
                </Suspense>
            );
        }

        // Show auth forms
        const signInRole = selectedRole === 'late_night_vendor' ? 'vendor' : selectedRole;
        const canSignUp = selectedRole === 'vendor' || selectedRole === 'delivery_agent';

        if (authView === 'signup' && canSignUp) {
            const signupRole = selectedRole as 'customer' | 'vendor' | 'delivery_agent' | 'late_night_vendor';
            return (
                <Suspense fallback={<PageLoader />}>
                    <SignUp
                        role={signupRole}
                        onBack={() => { setSelectedRole(null); setAuthView('signin'); }}
                        onSwitchToSignIn={() => setAuthView('signin')}
                    />
                </Suspense>
            );
        }

        return (
            <Suspense fallback={<PageLoader />}>
                <SignIn
                    role={signInRole as 'customer' | 'cafeteria' | 'vendor' | 'delivery_agent' | 'admin'}
                    onBack={() => setSelectedRole(null)}
                    onSwitchToSignUp={
                        canSignUp ? () => setAuthView('signup') : undefined
                    }
                />
            </Suspense>
        );
    }

    // Authenticated user routing
    return (
        <div className="min-h-screen bg-gray-50">
            <Routes>
                {/* Auth callback route */}
                <Route
                    path="/auth/callback"
                    element={
                        <Suspense fallback={<PageLoader />}>
                            <AuthCallback />
                        </Suspense>
                    }
                />

                {/* Customer routes */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <div className="authenticated-view">
                                <div className="main-content">
                                    {withSuspense(CustomerHome)({ onShowProfile: () => setShowProfile(true) })}
                                </div>
                                <BottomNavigation />
                            </div>
                        </ProtectedRoute>
                    }
                />

                {/* Vendor routes */}
                <Route
                    path="/vendor/*"
                    element={
                        <ProtectedRoute requiredRole="vendor">
                            <div className="authenticated-view">
                                <div className="main-content">
                                    {withSuspense(VendorDashboard)({ onShowProfile: () => setShowProfile(true) })}
                                </div>
                                <VendorBottomNavigation />
                            </div>
                        </ProtectedRoute>
                    }
                />

                {/* Delivery agent routes */}
                <Route
                    path="/delivery/*"
                    element={
                        <ProtectedRoute requiredRole="delivery_agent">
                            <div className="authenticated-view">
                                <div className="main-content">
                                    {withSuspense(DeliveryDashboard)({ onShowProfile: () => setShowProfile(true) })}
                                </div>
                                <BottomNavigation userRole="delivery_agent" />
                            </div>
                        </ProtectedRoute>
                    }
                />

                {/* Cafeteria routes */}
                <Route
                    path="/cafeteria/*"
                    element={
                        <ProtectedRoute requiredRole="cafeteria">
                            <div className="authenticated-view">
                                <div className="main-content">
                                    {withSuspense(CafeteriaDashboard)({ profile, onShowProfile: () => setShowProfile(true) })}
                                </div>
                                <BottomNavigation userRole="cafeteria" />
                            </div>
                        </ProtectedRoute>
                    }
                />

                {/* Admin routes */}
                <Route
                    path="/admin/*"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <div className="authenticated-view">
                                <div className="main-content">
                                    {withSuspense(AdminDashboard)({ onShowProfile: () => setShowProfile(true) })}
                                </div>
                                <BottomNavigation userRole="admin" />
                            </div>
                        </ProtectedRoute>
                    }
                />

                {/* Profile route */}
                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute>
                            <div className="authenticated-view">
                                <div className="main-content">
                                    {withSuspense(ProfileDashboard)({
                                        onBack: () => window.history.back(),
                                        onSignOut: signOut,
                                        onClose: () => window.history.back()
                                    })}
                                </div>
                                {currentRole === 'vendor' ? (
                                    <VendorBottomNavigation />
                                ) : (
                                    <BottomNavigation userRole={currentRole} />
                                )}
                            </div>
                        </ProtectedRoute>
                    }
                />

                {/* Checkout route */}
                <Route
                    path="/checkout"
                    element={
                        <ProtectedRoute>
                            <div className="authenticated-view">
                                <div className="main-content cart-full-height">
                                    {withSuspense(Checkout)({
                                        onBack: () => window.history.back(),
                                        onClose: () => window.history.back(),
                                        onSuccess: () => {
                                            window.history.back();
                                        }
                                    })}
                                </div>
                                <BottomNavigation />
                            </div>
                        </ProtectedRoute>
                    }
                />

                {/* Notifications route */}
                <Route
                    path="/notifications"
                    element={
                        <ProtectedRoute>
                            <div className="authenticated-view">
                                <div className="main-content">
                                    {withSuspense(NotificationsPanel)({ onClose: () => window.history.back() })}
                                </div>
                                <BottomNavigation userRole={currentRole} />
                            </div>
                        </ProtectedRoute>
                    }
                />

                {/* Catch all route - redirect to appropriate dashboard */}
                <Route
                    path="*"
                    element={
                        <Navigate
                            to={currentRole === 'vendor' ? '/vendor' : currentRole === 'delivery_agent' ? '/delivery' : '/'}
                            replace
                        />
                    }
                />
            </Routes>

            {/* Global Role Switcher - only show when user has multiple roles */}
            <RoleSwitcher variant="floating" />

            {/* Profile modal overlay */}
            {showProfile && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        {withSuspense(ProfileDashboard)({
                            onBack: () => setShowProfile(false),
                            onSignOut: signOut,
                            onClose: () => setShowProfile(false)
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;