export function MobilePlayerSpacer({ variant = "light" }: { variant?: "light" | "dark" }) {
  return (
    <div 
      className="sm:hidden h-24" 
      style={{ backgroundColor: variant === "dark" ? "#292929" : "#EDEBE5" }}
      aria-hidden="true"
    />
  );
}
