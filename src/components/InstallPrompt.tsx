import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const InstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallable(true);
            // Show prompt after a delay for better UX
            setTimeout(() => setIsVisible(true), 3000);
        };

        window.addEventListener('beforeinstallprompt', handler as EventListener);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler as EventListener);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        }

        setDeferredPrompt(null);
        setIsInstallable(false);
        setIsVisible(false);
    };

    const handleClose = () => {
        setIsVisible(false);
        // Don't show again in this session
        sessionStorage.setItem('installPromptDismissed', 'true');
    };

    // Don't show if already dismissed
    if (!isInstallable || !isVisible || sessionStorage.getItem('installPromptDismissed')) {
        return null;
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-fadeIn">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-2xl backdrop-blur-sm">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                        <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                            <Download className="w-5 h-5 text-white" />
                        </div>
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-sm mb-1">
                            Install Vartica App
                        </h3>
                        <p className="text-slate-300 text-xs mb-3">
                            Get the full app experience with faster loading and offline access
                        </p>

                        <div className="flex gap-2">
                            <button
                                onClick={handleInstall}
                                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-800"
                            >
                                Install
                            </button>
                            <button
                                onClick={handleClose}
                                className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstallPrompt;