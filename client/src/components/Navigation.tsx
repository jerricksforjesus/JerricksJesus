import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { useNavTheme } from "@/lib/navThemeContext";
import { useToast } from "@/hooks/use-toast";

export const OPEN_SETTINGS_PANEL_EVENT = "openSettingsPanel";

export function Navigation() {
  const [location] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(0);
  const { user, logout } = useAuth();
  const { theme } = useNavTheme();
  const { toast } = useToast();
  
  const isHomePage = location === "/";
  const useLightText = theme === "light" || (theme === "auto" && isHomePage);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getAccountLabel = () => {
    if (!user) return "Login";
    if (user.role === "admin") return "Admin";
    return "My Account";
  };

  const [, setLocation] = useLocation();
  
  // Mobile-only: handle My Account click differently
  const handleMobileAccountClick = (e: React.MouseEvent) => {
    if (!user) return; // Let normal navigation to /login happen
    
    if (location.startsWith("/admin")) {
      // Already on admin page: open panel but keep current section
      e.preventDefault();
      window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_PANEL_EVENT));
      setMobileMenuOpen(false);
    } else {
      // From other pages: navigate to admin with Settings section
      e.preventDefault();
      setLocation("/admin?section=settings");
      setMobileMenuOpen(false);
    }
  };

  const handleMinistriesClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location === "/") {
      // Already on home page - smooth scroll to ministries
      const element = document.getElementById("ministries");
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      // Navigate to home page with hash
      setLocation("/#ministries");
      // After navigation, scroll to section
      setTimeout(() => {
        const element = document.getElementById("ministries");
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { href: "/", label: "Sanctuary" },
    { href: "/live", label: "Live Stream" },
    { href: "/replays", label: "Replays" },
    { href: "/events", label: "Events" },
    { href: "/#ministries", label: "Ministries", onClick: handleMinistriesClick },
    { href: user ? "/admin" : "/login", label: getAccountLabel() },
  ];

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out px-6 py-3",
        // Mobile: always solid background. Desktop: transparent until scrolled
        "bg-background md:bg-transparent",
        isScrolled && "md:bg-background/90 md:backdrop-blur-md md:shadow-sm"
      )}
    >
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/">
          <span 
            className={cn(
              "cursor-pointer font-serif text-2xl md:text-3xl font-bold tracking-tighter hover:opacity-80 transition-colors duration-300",
              // Mobile: always dark text. Desktop: light text on transparent, dark when scrolled
              "text-foreground",
              useLightText && !isScrolled && "md:text-white"
            )}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >JERRICKS FOR JESUS</span>
        </Link>

        {/* Desktop Nav */}
        <div 
          className="hidden md:flex gap-2 items-center"
          onMouseLeave={() => setHoveredIndex(navLinks.findIndex(link => link.href === location))}
        >
          {navLinks.map((link, index) => (
            <Link key={link.label} href={link.href} onClick={link.onClick}>
              <span
                className="relative cursor-pointer px-5 py-1 block"
                onMouseEnter={() => setHoveredIndex(index)}
              >
                {hoveredIndex === index && (
                  <motion.div
                    layoutId="navHighlight"
                    className={cn(
                      "absolute inset-0 rounded-full",
                      isScrolled ? "bg-background" : "bg-white"
                    )}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span
                  className={cn(
                    "relative z-10 text-xs font-bold tracking-widest uppercase transition-colors duration-300",
                    hoveredIndex === index 
                      ? "text-primary" 
                      : useLightText && !isScrolled ? "text-white/90" : "text-foreground/80"
                  )}
                >
                  {link.label}
                </span>
              </span>
            </Link>
          ))}
          <Link href="/live">
            <span className="cursor-pointer ml-4 px-6 py-2 bg-primary text-primary-foreground rounded-full text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-transform hover:scale-105">
              Watch Live
            </span>
          </Link>
        </div>

        {/* Mobile Menu Toggle - always dark since mobile has solid background */}
        <button
          className="md:hidden transition-colors duration-300 text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>
      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-background border-b p-6 md:hidden flex flex-col gap-4 animate-in slide-in-from-top-5">
          {navLinks.map((link) => {
            const isAccountLink = link.label === getAccountLabel() && user;
            const isMinistriesLink = link.label === "Ministries";
            let mobileLabel = link.label;
            if (link.label === "Sanctuary") mobileLabel = "Return Home";
            if (link.label === "Admin") mobileLabel = "Admin Settings";
            if (link.label === "Ministries") mobileLabel = "Our Ministries";
            return (
              <Link 
                key={link.label} 
                href={link.href} 
                onClick={isAccountLink ? handleMobileAccountClick : isMinistriesLink ? link.onClick : undefined}
              >
                <span
                  className="cursor-pointer text-lg font-serif font-medium"
                  onClick={() => !isAccountLink && !isMinistriesLink && setMobileMenuOpen(false)}
                >
                  {mobileLabel}
                </span>
              </Link>
            );
          })}
          {user && (
            <button
              className="cursor-pointer text-lg font-serif font-medium text-left text-red-600"
              onClick={async () => {
                setMobileMenuOpen(false);
                await logout();
                toast({ title: "Logged out", description: "You have been signed out." });
              }}
            >
              Logout
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
