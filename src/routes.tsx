import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { LandingPage } from './components/LandingPage';
import { SignIn } from './components/auth/SignIn';
import { SignUp } from './components/auth/SignUp';
import { CustomerHome } from './components/customer/CustomerHome';
import CafeteriaDashboard from './components/cafeteria/CafeteriaDashboard';
import { DeliveryDashboard } from './components/delivery/DeliveryDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ProfileDashboard } from './components/shared/ProfileDashboard';
import { PaymentSuccess } from './components/customer/PaymentSuccess';
import { VendorDashboard } from './components/vendor/VendorDashboard';
import AuthCallback from './components/auth/AuthCallback';

type Role = 'customer' | 'cafeteria' | 'vendor' | 'late_night_vendor' | 'delivery_agent' | 'admin';

// Protected Route Component
const ProtectedRoute = ({
    children,
    requiredRole
}: {
    children: React.ReactNode;
    requiredRole?: Role | Role[]
}) => {
    const { user, profile, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user || !profile) {
        return <Navigate to="/" replace />;
    }

    if (requiredRole) {
        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        if (!roles.includes(profile.role as Role)) {
            return <Navigate to="/unauthorized" replace />;
        }
    }

    return <>{children}</>;
};

// Public Only Route Component
const PublicOnlyRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};

// Dashboard Layout Component
const DashboardLayout = () => {
    const { user, profile, signOut } = useAuth();
    const [showProfile, setShowProfile] = React.useState(false);

    if (!user || !profile) return null;

    const role = profile.role as Role;

    if (showProfile) {
        return <ProfileDashboard onBack={() => setShowProfile(false)} onSignOut={signOut} />;
    }

    const renderDashboard = () => {
        switch (role) {
            case 'customer':
                return <CustomerHome onShowProfile={() => setShowProfile(true)} />;
            case 'cafeteria':
                return <CafeteriaDashboard profile={profile} onShowProfile={() => setShowProfile(true)} />;
            case 'vendor':
            case 'late_night_vendor':
                return <VendorDashboard onShowProfile={() => setShowProfile(true)} />;
            case 'delivery_agent':
                return <DeliveryDashboard onShowProfile={() => setShowProfile(true)} />;
            case 'admin':
                return <AdminDashboard onShowProfile={() => setShowProfile(true)} />;
            default:
                return (
                    <div className="min-h-screen flex items-center justify-center bg-red-50">
                        <div className="text-center p-6">
                            <h2 className="text-xl font-bold text-red-700">Account Error</h2>
                            <p className="mt-2 text-red-600">Invalid account role. Please contact support.</p>
                            <button
                                onClick={signOut}
                                className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                );
        }
    };

    return renderDashboard();
};

// Auth Layout Component
const AuthLayout = () => {
    const [selectedRole, setSelectedRole] = React.useState<Role | null>(null);
    const [authView, setAuthView] = React.useState<'signin' | 'signup'>('signin');

    const handleRoleSelect = (role: Role) => {
        setSelectedRole(role);
        setAuthView('signin');
    };

    const handleBack = () => {
        setSelectedRole(null);
        setAuthView('signin');
    };

    if (!selectedRole) {
        return <LandingPage onRoleSelect={handleRoleSelect} />;
    }

    if (authView === 'signup' && (selectedRole === 'vendor' || selectedRole === 'late_night_vendor' || selectedRole === 'delivery_agent')) {
        return (
            <SignUp
                role={selectedRole === 'late_night_vendor' ? 'late_night_vendor' : selectedRole}
                onBack={handleBack}
                onSwitchToSignIn={() => setAuthView('signin')}
            />
        );
    }

    return (
        <SignIn
            role={selectedRole === 'late_night_vendor' ? 'vendor' : selectedRole}
            onBack={handleBack}
            onSwitchToSignUp={
                selectedRole === 'vendor' || selectedRole === 'late_night_vendor' || selectedRole === 'delivery_agent'
                    ? () => setAuthView('signup')
                    : undefined
            }
        />
    );
};

// Router configuration
export const router = createBrowserRouter([
    {
        path: '/',
        element: <AuthLayout />,
        errorElement: <div className="min-h-screen flex items-center justify-center">Page not found</div>
    },
    {
        path: '/auth/callback',
        element: <AuthCallback />
    },
    {
        path: '/payment-success',
        element: <PaymentSuccess />
    },
    {
        path: '/dashboard',
        element: (
            <ProtectedRoute>
                <DashboardLayout />
            </ProtectedRoute>
        )
    },
    {
        path: '/profile',
        element: (
            <ProtectedRoute>
                <ProfileDashboard
                    onBack={() => window.history.back()}
                    onSignOut={() => {
                        // Sign out handled by ProfileDashboard
                    }}
                />
            </ProtectedRoute>
        )
    },
    {
        path: '/admin',
        element: (
            <ProtectedRoute requiredRole="admin">
                <AdminDashboard onShowProfile={() => { }} />
            </ProtectedRoute>
        )
    },
    {
        path: '/unauthorized',
        element: (
            <div className="min-h-screen flex items-center justify-center bg-yellow-50">
                <div className="text-center p-6">
                    <h2 className="text-xl font-bold text-yellow-700">Access Denied</h2>
                    <p className="mt-2 text-yellow-600">You don't have permission to access this page.</p>
                    <button
                        onClick={() => window.history.back()}
                        className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        )
    }
]);

export default router;