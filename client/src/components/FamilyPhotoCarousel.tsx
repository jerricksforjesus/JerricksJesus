import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Photo } from "@shared/schema";

function shuffleArray<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  let currentSeed = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
    const j = currentSeed % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function FamilyPhotoCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [shuffleSeed] = useState(() => Math.floor(Math.random() * 1000000));

  const { data: photos = [] } = useQuery<Photo[]>({
    queryKey: ["photos"],
    queryFn: async () => {
      const response = await fetch("/api/photos");
      if (!response.ok) throw new Error("Failed to fetch photos");
      return response.json();
    },
  });

  const { data: shouldRandomize = false } = useQuery<boolean>({
    queryKey: ["carousel-randomize"],
    queryFn: async () => {
      const response = await fetch("/api/settings/carousel-randomize");
      if (!response.ok) return false;
      const data = await response.json();
      return data.randomize;
    },
    refetchOnWindowFocus: true,
  });

  const displayPhotos = useMemo(() => {
    if (shouldRandomize && photos.length > 0) {
      return shuffleArray(photos, shuffleSeed);
    }
    return photos;
  }, [photos, shouldRandomize, shuffleSeed]);

  useEffect(() => {
    const fetchSignedUrls = async () => {
      const urls: Record<string, string> = {};
      for (const photo of photos) {
        const imagePath = photo.imagePath.startsWith('/objects/') 
          ? photo.imagePath 
          : `/objects/${photo.imagePath}`;
        
        try {
          const response = await fetch(`/api/objects/signed-url?path=${encodeURIComponent(imagePath)}`);
          if (response.ok) {
            const data = await response.json();
            urls[photo.id] = data.url;
          }
        } catch (error) {
          console.error('Error fetching signed URL for photo:', photo.id);
        }
      }
      setSignedUrls(urls);
    };

    if (photos.length > 0) {
      fetchSignedUrls();
    }
  }, [photos]);

  useEffect(() => {
    if (displayPhotos.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayPhotos.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [displayPhotos.length]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + displayPhotos.length) % displayPhotos.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % displayPhotos.length);
  };

  if (displayPhotos.length === 0) {
    return null;
  }

  const currentPhoto = displayPhotos[currentIndex];
  const imageUrl = signedUrls[currentPhoto?.id] || "";

  return (
    <section className="py-20 px-6 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 text-primary mb-4">
            <Users className="w-5 h-5" />
            <span className="text-sm font-medium uppercase tracking-wider">Our Church Family</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
            Moments of Fellowship
          </h2>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
            Capturing the joy and love shared<br className="md:hidden" /> within our community
          </p>
        </motion.div>

        <div className="relative">
          <div className="aspect-[16/9] overflow-hidden rounded-2xl shadow-2xl bg-muted">
            <AnimatePresence mode="wait">
              {imageUrl && (
                <motion.div
                  key={currentPhoto.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="w-full h-full relative"
                >
                  <img
                    src={imageUrl}
                    alt={currentPhoto.caption || "Church family moment"}
                    className="w-full h-full object-cover"
                    data-testid={`photo-carousel-image-${currentPhoto.id}`}
                  />
                  {currentPhoto.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6 md:p-8">
                      <p className="text-white text-lg md:text-xl font-serif" data-testid="text-photo-caption">
                        {currentPhoto.caption}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {!imageUrl && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
              </div>
            )}
          </div>
        </div>

        {photos.length > 1 && (
          <div className="flex justify-center items-center gap-8 mt-6">
            <Button
              variant="ghost"
              size="icon"
              className="bg-primary/10 hover:bg-primary/20 text-primary rounded-full w-12 h-12"
              onClick={goToPrevious}
              data-testid="button-carousel-prev"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="bg-primary/10 hover:bg-primary/20 text-primary rounded-full w-12 h-12"
              onClick={goToNext}
              data-testid="button-carousel-next"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
