import { createContext, useContext, useState, ReactNode } from "react";

type NavTheme = "auto" | "light" | "dark";

interface NavThemeContextType {
  theme: NavTheme;
  setTheme: (theme: NavTheme) => void;
}

const NavThemeContext = createContext<NavThemeContextType>({
  theme: "auto",
  setTheme: () => {},
});

export function NavThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<NavTheme>("auto");
  
  return (
    <NavThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </NavThemeContext.Provider>
  );
}

export function useNavTheme() {
  return useContext(NavThemeContext);
}

export function analyzeImageBrightness(imageSrc: string): Promise<"light" | "dark"> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        resolve("dark");
        return;
      }
      
      const sampleSize = 100;
      canvas.width = sampleSize;
      canvas.height = sampleSize;
      
      ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
      
      try {
        const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
        const data = imageData.data;
        
        let totalBrightness = 0;
        const pixelCount = data.length / 4;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const brightness = (0.299 * r + 0.587 * g + 0.114 * b);
          totalBrightness += brightness;
        }
        
        const avgBrightness = totalBrightness / pixelCount;
        resolve(avgBrightness < 128 ? "dark" : "light");
      } catch {
        resolve("dark");
      }
    };
    
    img.onerror = () => {
      resolve("dark");
    };
    
    img.src = imageSrc;
  });
}
