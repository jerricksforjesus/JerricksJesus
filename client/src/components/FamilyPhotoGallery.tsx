import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import type { Photo } from "@shared/schema";

export function FamilyPhotoGallery() {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<number, string>>({});

  const { data: photos = [], isLoading } = useQuery<Photo[]>({
    queryKey: ["photos"],
    queryFn: async () => {
      const response = await fetch("/api/photos");
      if (!response.ok) throw new Error("Failed to fetch photos");
      return response.json();
    },
  });

  useEffect(() => {
    const fetchSignedUrls = async () => {
      const urls: Record<number, string> = {};
      for (const photo of photos) {
        // The imagePath from the database already includes /objects/ prefix from normalization
        // Use it directly without adding any prefix
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

  const goToPrevious = () => {
    if (selectedPhotoIndex !== null && photos.length > 1) {
      let newIndex = (selectedPhotoIndex - 1 + photos.length) % photos.length;
      // Find the previous photo that has a signed URL
      let attempts = 0;
      while (!signedUrls[photos[newIndex].id] && attempts < photos.length) {
        newIndex = (newIndex - 1 + photos.length) % photos.length;
        attempts++;
      }
      setSelectedPhotoIndex(newIndex);
    }
  };

  const goToNext = () => {
    if (selectedPhotoIndex !== null && photos.length > 1) {
      let newIndex = (selectedPhotoIndex + 1) % photos.length;
      // Find the next photo that has a signed URL
      let attempts = 0;
      while (!signedUrls[photos[newIndex].id] && attempts < photos.length) {
        newIndex = (newIndex + 1) % photos.length;
        attempts++;
      }
      setSelectedPhotoIndex(newIndex);
    }
  };

  if (isLoading) {
    return (
      <div className="py-8">
        <div className="flex items-center justify-center gap-3 text-muted-foreground">
          <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
          <span>Loading photos...</span>
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="py-8 text-center">
        <Camera className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">No family photos available yet.</p>
      </div>
    );
  }

  const selectedPhoto = selectedPhotoIndex !== null ? photos[selectedPhotoIndex] : null;

  return (
    <div className="py-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {photos.slice(0, 8).map((photo, index) => (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group cursor-pointer"
            onClick={() => setSelectedPhotoIndex(index)}
            data-testid={`gallery-photo-${photo.id}`}
          >
            <div className="relative aspect-square rounded-lg overflow-hidden bg-muted shadow-md">
              {signedUrls[photo.id] ? (
                <img
                  src={signedUrls[photo.id]}
                  alt={photo.caption || "Family photo"}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </div>
            {photo.caption && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{photo.caption}</p>
            )}
          </motion.div>
        ))}
      </div>

      {photos.length > 8 && (
        <p className="text-center text-sm text-muted-foreground mt-4">
          +{photos.length - 8} more photos
        </p>
      )}

      <Dialog open={selectedPhotoIndex !== null} onOpenChange={() => setSelectedPhotoIndex(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black">
          <VisuallyHidden>
            <DialogTitle>{selectedPhoto?.caption || "Photo Viewer"}</DialogTitle>
          </VisuallyHidden>
          <AnimatePresence mode="wait">
            {selectedPhoto && signedUrls[selectedPhoto.id] && (
              <motion.div
                key={selectedPhoto.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative"
              >
                <div className="aspect-[4/3] md:aspect-video flex items-center justify-center bg-black">
                  <img
                    src={signedUrls[selectedPhoto.id]}
                    alt={selectedPhoto.caption || "Family photo"}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                
                {photos.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full"
                      onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
                      data-testid="button-gallery-prev"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full"
                      onClick={(e) => { e.stopPropagation(); goToNext(); }}
                      data-testid="button-gallery-next"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </Button>
                  </>
                )}

                {selectedPhoto.caption && (
                  <div className="p-4 bg-card">
                    <p className="text-sm">{selectedPhoto.caption}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  );
}
