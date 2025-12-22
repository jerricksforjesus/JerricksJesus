export function MobilePlayerSpacer({ variant = "light" }: { variant?: "light" | "dark" | "admin" }) {
  const colors = {
    light: "#f1efea",
    admin: "#EDEBE5",
    dark: "#292929",
  };
  
  return (
    <div 
      className="sm:hidden h-24" 
      style={{ backgroundColor: colors[variant] }}
      aria-hidden="true"
    />
  );
}
