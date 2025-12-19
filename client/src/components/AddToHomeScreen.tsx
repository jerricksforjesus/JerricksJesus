import { Smartphone, Apple, Chrome } from "lucide-react";

export function AddToHomeScreen() {
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
        <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
          <li>Open this website in <strong>Chrome</strong></li>
          <li>Tap the <strong>three dots menu</strong> (top right corner)</li>
          <li>Tap <strong>"Add to Home screen"</strong></li>
          <li>Tap <strong>"Add"</strong> to confirm</li>
        </ol>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Once added, you can access Jerricks for Jesus directly from your home screen like an app!
      </p>
    </div>
  );
}
