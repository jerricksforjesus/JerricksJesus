import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import charityLogoFallback from "@assets/WhatsApp Image 2025-11-23 at 16.30.41_1764630455920.jpeg";

interface CharityComingSoonProps {
  message?: string;
}

interface MinistryImageData {
  imageUrl: string | null;
  altText: string | null;
}

export function CharityComingSoon({ message }: CharityComingSoonProps) {
  const { data: imageData } = useQuery<MinistryImageData>({
    queryKey: ["ministry-image", "community"],
    queryFn: async () => {
      const response = await fetch("/api/settings/ministry-image/community");
      if (!response.ok) throw new Error("Failed to fetch ministry image");
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const imageSrc = imageData?.imageUrl || charityLogoFallback;
  const altText = imageData?.altText || "Jerricks for Jesus Charity Logo";
  const displayMessage = message || "Jerricks for Jesus Charity – Coming Soon";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center py-8"
    >
      <img
        src={imageSrc}
        alt={altText}
        className="w-48 h-48 object-contain mb-6 rounded-lg"
        data-testid="img-charity-logo"
      />
      <p 
        className="text-xl md:text-2xl font-serif text-center text-primary font-medium"
        data-testid="text-charity-coming-soon"
      >
        {displayMessage}
      </p>
    </motion.div>
  );
}
