import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Video, Users, MessageCircle, Heart } from "lucide-react";

export default function LiveStream() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      
      <div className="flex-1 pt-24 pb-12 px-4 md:px-8 max-w-[1600px] mx-auto w-full grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Video Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="aspect-video bg-black rounded-xl overflow-hidden relative shadow-2xl">
            {!isLoggedIn ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-white p-6 text-center">
                <Video className="w-16 h-16 mb-6 text-primary opacity-80" />
                <h2 className="text-3xl font-serif mb-4">Join the Live Sanctuary</h2>
                <p className="text-zinc-400 max-w-md mb-8">
                  Connect with your Zoom account to participate in the service, chat with members, and be part of the fellowship.
                </p>
                <Button 
                  size="lg" 
                  className="bg-[#2D8CFF] hover:bg-[#2D8CFF]/90 text-white font-bold px-8 py-6 text-lg rounded-full"
                  onClick={() => setIsLoggedIn(true)}
                >
                  Sign in with Zoom
                </Button>
              </div>
            ) : (
              <div className="relative w-full h-full bg-zinc-800">
                {/* Mock Zoom Interface */}
                <div className="absolute top-4 right-4 z-10 bg-black/50 px-3 py-1 rounded text-white text-sm flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/> LIVE
                </div>
                <div className="w-full h-full flex items-center justify-center text-white/20">
                  <span className="text-2xl font-serif">Stream Feed Connected...</span>
                </div>
                
                {/* Mock Controls */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 flex justify-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-500"><Video className="w-5 h-5" /></div>
                   <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"><Users className="w-5 h-5" /></div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold">Sunday Morning Service</h1>
              <p className="text-muted-foreground mt-2">Started streaming 15 minutes ago</p>
            </div>
            <Button variant="outline" className="gap-2">
              <Heart className="w-4 h-4 text-primary" /> Give Offering
            </Button>
          </div>
        </div>

        {/* Chat Sidebar */}
        <div className="lg:col-span-1 h-[600px] lg:h-auto bg-card rounded-xl border border-border/50 flex flex-col shadow-lg">
          <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/30 rounded-t-xl">
            <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> Live Chat
            </h3>
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-600 rounded-full" /> 124 Online
            </span>
          </div>
          
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {/* Mock Chat Messages */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">SJ</div>
              <div>
                <span className="text-xs font-bold text-foreground/80">Sarah Jenkins</span>
                <p className="text-sm text-muted-foreground">Good morning everyone! Blessed to be here.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-xs font-bold text-secondary">MK</div>
              <div>
                <span className="text-xs font-bold text-foreground/80">Mike K.</span>
                <p className="text-sm text-muted-foreground">Amen! The choir sounds beautiful today.</p>
              </div>
            </div>
             <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-600">PA</div>
              <div>
                <span className="text-xs font-bold text-foreground/80">Pastor Adams</span>
                <p className="text-sm text-muted-foreground">Welcome to all our online visitors!</p>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-border/50 bg-background rounded-b-xl">
            <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <Input placeholder="Type a message..." className="flex-1" />
              <Button type="submit" size="icon" className="shrink-0">
                <MessageCircle className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
