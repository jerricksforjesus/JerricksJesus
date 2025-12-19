import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { useNavTheme } from "@/lib/navThemeContext";

export const OPEN_SETTINGS_PANEL_EVENT = "openSettingsPanel";

export function Navigation() {
  const [location] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(0);
  const { user } = useAuth();
  const { theme } = useNavTheme();
  
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
    
    // If already on admin page, trigger the settings panel with settings section
    if (location.startsWith("/admin")) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_PANEL_EVENT, { detail: { section: "settings" } }));
      setMobileMenuOpen(false);
    } else {
      // Navigate to admin with settings section (mobile will auto-open panel)
      e.preventDefault();
      setLocation("/admin?section=settings&openPanel=true");
      setMobileMenuOpen(false);
    }
  };

  const navLinks = [
    { href: "/", label: "Sanctuary" },
    { href: "/live", label: "Live Stream" },
    { href: "/replays", label: "Replays" },
    { href: "/events", label: "Events" },
    { href: user ? "/admin" : "/login", label: getAccountLabel() },
  ];

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out px-6 py-3",
        isScrolled ? "bg-background md:bg-background/90 md:backdrop-blur-md shadow-sm" : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/">
          <span 
            className={cn(
              "cursor-pointer font-serif text-2xl md:text-3xl font-bold tracking-tighter hover:opacity-80 transition-colors duration-300",
              useLightText && !isScrolled ? "text-white" : "text-foreground"
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
            <Link key={link.href} href={link.href}>
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

        {/* Mobile Menu Toggle */}
        <button
          className={cn(
            "md:hidden transition-colors duration-300",
            useLightText && !isScrolled ? "text-white" : "text-foreground"
          )}
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
            return (
              <Link 
                key={link.href} 
                href={link.href} 
                onClick={isAccountLink ? handleMobileAccountClick : undefined}
              >
                <span
                  className="cursor-pointer text-lg font-serif font-medium"
                  onClick={() => !isAccountLink && setMobileMenuOpen(false)}
                >
                  {link.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
