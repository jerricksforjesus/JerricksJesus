import { motion } from "framer-motion";
import charityLogo from "@assets/WhatsApp Image 2025-11-23 at 16.30.41_1764630455920.jpeg";

export function CharityComingSoon() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center py-8"
    >
      <img
        src={charityLogo}
        alt="Jerricks for Jesus Charity Logo"
        className="w-48 h-48 object-contain mb-6 rounded-lg"
        data-testid="img-charity-logo"
      />
      <p 
        className="text-xl md:text-2xl font-serif text-center text-primary font-medium"
        data-testid="text-charity-coming-soon"
      >
        Jerricks for Jesus Charity – Coming Soon
      </p>
    </motion.div>
  );
}
