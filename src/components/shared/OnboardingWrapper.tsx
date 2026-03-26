import React from 'react';
import { OnboardingModal } from './OnboardingModal';
import { TooltipOverlay } from './TooltipOverlay';
import { useRole } from '../../contexts/RoleContext';
import { useOnboarding } from '../../hooks/useOnboarding';

// Type for onboarding roles (excludes admin)
type OnboardingRole = 'customer' | 'vendor' | 'delivery_agent' | 'cafeteria' | 'late_night_vendor';

interface OnboardingWrapperProps {
    showOnboarding: boolean;
    showTooltips: boolean;
    onStartTooltips: () => void;
    onStopTooltips: () => void;
}

export function OnboardingWrapper({
    showOnboarding,
    showTooltips,
    onStartTooltips,
    onStopTooltips
}: OnboardingWrapperProps) {
    const { currentRole } = useRole();

    // Map all roles to onboarding role (admin uses customer onboarding)
    const onboardingRole: OnboardingRole = currentRole === 'admin' || currentRole === undefined ? 'customer' :
        currentRole === 'vendor' || currentRole === 'cafeteria' || currentRole === 'late_night_vendor' ? 'vendor' :
            currentRole === 'delivery_agent' ? 'delivery_agent' : 'customer';

    const onboarding = useOnboarding({
        role: onboardingRole,
        onComplete: () => { }
    });

    return (
        <>
            <OnboardingModal
                role={onboardingRole}
                isOpen={showOnboarding}
                onComplete={() => { }}
                onSkip={() => { }}
            />
            <TooltipOverlay
                role={onboardingRole}
                isOpen={showTooltips}
                onClose={onStopTooltips}
            />
        </>
    );
}

export default OnboardingWrapper;
