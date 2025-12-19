import { Smartphone, Apple, Download, CheckCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function AddToHomeScreen() {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    const iOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const android = /Android/i.test(navigator.userAgent);
    setIsIOS(iOS);
    setIsAndroid(android);

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setCanInstall(false);
      deferredPrompt.current = null;
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt.current) return;

    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
      setCanInstall(false);
    }
    deferredPrompt.current = null;
  };

  if (isInstalled) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
        <h3 className="text-lg font-serif font-semibold text-green-800">Already Installed!</h3>
        <p className="text-green-700 mt-2">Jerricks for Jesus is on your home screen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-muted/50 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Apple className="w-6 h-6 text-primary" />
          <h3 className="text-lg font-serif font-semibold">iPhone / iPad (Safari)</h3>
        </div>
        <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
          <li>Open this website in <strong>Safari</strong></li>
          <li>Tap the <strong>Share</strong> button (square with arrow pointing up)</li>
          <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
          <li>Tap <strong>"Add"</strong> in the top right corner</li>
        </ol>
      </div>

      <div className="bg-muted/50 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Smartphone className="w-6 h-6 text-primary" />
          <h3 className="text-lg font-serif font-semibold">Android (Chrome)</h3>
        </div>
        
        {canInstall && isAndroid ? (
          <div className="text-center">
            <Button 
              onClick={handleInstallClick}
              size="lg"
              className="font-bold px-8"
              style={{ backgroundColor: "#b47a5f", color: "#ffffff" }}
              data-testid="button-install-pwa"
            >
              <Download className="w-5 h-5 mr-2" />
              Install App
            </Button>
            <p className="text-sm text-muted-foreground mt-3">
              Tap the button above to add Jerricks for Jesus to your home screen
            </p>
          </div>
        ) : (
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Open this website in <strong>Chrome</strong></li>
            <li>Tap the <strong>three dots menu</strong> (top right corner)</li>
            <li>Tap <strong>"Add to Home screen"</strong></li>
            <li>Tap <strong>"Add"</strong> to confirm</li>
          </ol>
        )}
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Once added, you can access Jerricks for Jesus directly from your home screen like an app!
      </p>
    </div>
  );
}
