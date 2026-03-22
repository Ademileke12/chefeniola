/**
 * FontService - Manages font loading and caching from Google Fonts API
 * 
 * Provides a curated list of fonts across different categories and handles
 * dynamic loading with caching and fallback support.
 */

export interface FontDefinition {
  family: string;
  category: 'serif' | 'sans-serif' | 'display' | 'handwriting';
  variants: string[];
  googleFontsUrl: string;
}

export interface FontService {
  loadFont(fontFamily: string): Promise<void>;
  getFontList(): FontDefinition[];
  isFontLoaded(fontFamily: string): boolean;
}

class FontServiceImpl implements FontService {
  private loadedFonts: Set<string> = new Set();
  private fontCache: Map<string, FontDefinition> = new Map();
  private loadingPromises: Map<string, Promise<void>> = new Map();

  // Curated list of 20+ fonts across different categories
  private readonly fonts: FontDefinition[] = [
    // Serif fonts (4)
    {
      family: 'Playfair Display',
      category: 'serif',
      variants: ['400', '700'],
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap'
    },
    {
      family: 'Merriweather',
      category: 'serif',
      variants: ['400', '700'],
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap'
    },
    {
      family: 'Lora',
      category: 'serif',
      variants: ['400', '700'],
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;700&display=swap'
    },
    {
      family: 'Crimson Text',
      category: 'serif',
      variants: ['400', '700'],
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400;700&display=swap'
    },
    // Sans-serif fonts (5)
    {
      family: 'Inter',
      category: 'sans-serif',
      variants: ['400', '700'],
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap'
    },
    {
      family: 'Roboto',
      category: 'sans-serif',
      variants: ['400', '700'],
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap'
    },
    {
      family: 'Open Sans',
      category: 'sans-serif',
      variants: ['400', '700'],
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700&display=swap'
    },
    {
      family: 'Montserrat',
      category: 'sans-serif',
      variants: ['400', '700'],
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap'
    },
    {
      family: 'Poppins',
      category: 'sans-serif',
      variants: ['400', '700'],
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap'
    },
    // Display fonts (7)
    {
      family: 'Bebas Neue',
      category: 'display',
      variants: ['400'],
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap'
    },
    {
      family: 'Righteous',
      category: 'display',
      variants: ['400'],
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Righteous&display=swap'
    },
    {
      family: 'Fredoka One',
      category: 'display',
      variants: ['400'],
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap'
    },
    {
      family: 'Pacifico',
      category: 'display',
      variants: ['400'],
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Pacifico&display=swap'
    },
    {
      family: 'Oswald',
      category: 'display',
      variants: ['400', '700'],
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Oswald:wght@400;700&display=swap'
    },
    {
      family: 'Archivo Black',
      category: 'display',
      variants: ['400'],
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap'
    },
    {
      family: 'Bangers',
      category: 'display',
      variants: ['400'],
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Bangers&display=swap'
    },
    // Handwriting fonts (6)
    {
      family: 'Dancing Script',
      category: 'handwriting',
      variants: ['400', '700'],
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap'
    },
    {
      family: 'Caveat',
      category: 'handwriting',
      variants: ['400', '700'],
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap'
    },
    {
      family: 'Satisfy',
      category: 'handwriting',
      variants: ['400'],
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Satisfy&display=swap'
    },
    {
      family: 'Kalam',
      category: 'handwriting',
      variants: ['400', '700'],
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&display=swap'
    },
    {
      family: 'Indie Flower',
      category: 'handwriting',
      variants: ['400'],
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Indie+Flower&display=swap'
    },
    {
      family: 'Permanent Marker',
      category: 'handwriting',
      variants: ['400'],
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap'
    }
  ];

  constructor() {
    // Initialize font cache
    this.fonts.forEach(font => {
      this.fontCache.set(font.family, font);
    });
  }

  /**
   * Get the complete list of available fonts
   */
  getFontList(): FontDefinition[] {
    return [...this.fonts];
  }

  /**
   * Check if a font has been loaded
   */
  isFontLoaded(fontFamily: string): boolean {
    return this.loadedFonts.has(fontFamily);
  }

  /**
   * Load a font dynamically from Google Fonts API
   * Implements caching to avoid duplicate loads
   * Falls back to system fonts on failure
   */
  async loadFont(fontFamily: string): Promise<void> {
    // Check if already loaded
    if (this.loadedFonts.has(fontFamily)) {
      return;
    }

    // Check if currently loading (avoid duplicate requests)
    if (this.loadingPromises.has(fontFamily)) {
      return this.loadingPromises.get(fontFamily)!;
    }

    // Get font definition from cache
    const fontDef = this.fontCache.get(fontFamily);
    if (!fontDef) {
      console.warn(`Font "${fontFamily}" not found in font library. Using fallback.`);
      return;
    }

    // Create loading promise
    const loadingPromise = this.loadFontInternal(fontDef);
    this.loadingPromises.set(fontFamily, loadingPromise);

    try {
      await loadingPromise;
      this.loadedFonts.add(fontFamily);
    } catch (error) {
      console.error(`Failed to load font "${fontFamily}":`, error);
      // Font will fall back to system default
    } finally {
      this.loadingPromises.delete(fontFamily);
    }
  }

  /**
   * Internal method to load font via Google Fonts API
   */
  private async loadFontInternal(fontDef: FontDefinition): Promise<void> {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      // In non-browser environments (like tests), just mark as loaded
      return;
    }

    // Check if link already exists in document
    const existingLink = document.querySelector(
      `link[href="${fontDef.googleFontsUrl}"]`
    );
    
    if (existingLink) {
      // Font link already in document, wait for it to load
      return this.waitForFontLoad(fontDef.family);
    }

    // Create and append link element
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontDef.googleFontsUrl;
    
    // Wait for link to load with timeout
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        // Timeout after 2 seconds - resolve anyway to prevent hanging
        resolve();
      }, 2000);

      link.onload = () => {
        clearTimeout(timeout);
        resolve();
      };
      
      link.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`Failed to load font stylesheet for ${fontDef.family}`));
      };
      
      document.head.appendChild(link);
    });

    // Wait for font to be ready
    await this.waitForFontLoad(fontDef.family);
  }

  /**
   * Wait for font to be loaded and ready using Font Loading API
   */
  private async waitForFontLoad(fontFamily: string): Promise<void> {
    if (typeof document === 'undefined' || !document.fonts) {
      // Font Loading API not available, assume font is loaded
      return;
    }

    try {
      // Use Font Loading API to check if font is ready
      // Set a timeout to prevent hanging in test environments
      const loadPromise = document.fonts.load(`16px "${fontFamily}"`);
      const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 100));
      
      await Promise.race([loadPromise, timeoutPromise]);
      
      // Additional check to ensure font is actually available
      const fontAvailable = document.fonts.check(`16px "${fontFamily}"`);
      if (!fontAvailable) {
        // Font not available yet, but don't throw - just continue
        console.debug(`Font "${fontFamily}" not immediately available after loading`);
      }
    } catch (error) {
      console.warn(`Font Loading API check failed for "${fontFamily}":`, error);
      // Fall back to timeout-based approach
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

// Export singleton instance
export const fontService = new FontServiceImpl();
