import { useEffect, useState, useRef, useCallback } from 'react';
import { File } from './File';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { type ImageMetadata } from '../../types/index';
import { useViewerStore } from '../../store/viewerStore';

// Global flag to prevent multiple completion messages
let isCompletionSent = false;

interface BatchLoadedImagesProps {
  images: ImageMetadata[];
  positions: { x: number; y: number; z: number }[];
  onImageClick: (url: string | null, data?: any) => void;
}

export function BatchLoadedImages({ 
  images, 
  positions, 
  onImageClick
}: BatchLoadedImagesProps) {
  const [loadedCount, setLoadedCount] = useState(0);
  const batchSize = 25; // Load 25 images at a time
  const { setIsLoading } = useViewerStore();
  const instanceId = useRef(Math.random().toString(36).substr(2, 9));
  
  useEffect(() => {
    // Load images in batches
    const timer = setInterval(() => {
      setLoadedCount(prev => {
        const next = Math.min(prev + batchSize, images.length);
        
        // Hide loading screen when first batch is loaded (not before)
        if (prev === 0 && next > 0) {
          setTimeout(() => {
            setIsLoading(false);
          }, 100); // Small delay to ensure first batch renders
        }
        
        if (next >= images.length) {
          clearInterval(timer);
        }
        return next;
      });
    }, 200); // 200ms delay between batches
    
    return () => clearInterval(timer);
  }, [images.length, batchSize, setIsLoading]);

  // Track images array reference to detect actual changes (not just length)
  const imagesRef = useRef<string>('');
  
  // Reset when images actually change (by comparing stringified array)
  useEffect(() => {
    const currentImagesKey = images.map(img => img.url).join('|');
    
    // Only reset if images actually changed (not just re-render)
    if (imagesRef.current !== currentImagesKey) {
      imagesRef.current = currentImagesKey;
      setLoadedCount(0);
      console.log(`[${instanceId.current}] Initialized with ${images.length} images`);
      // Reset completion flag when new images load
      isCompletionSent = false;
    }
  }, [images]);
  
  return (
    <>
      {images.slice(0, loadedCount).map((image, index) => (
        <ErrorBoundary key={image.url} resetKey={image.url}>
          <File 
            imageUrl={image.url} 
            position={[positions[index].x, positions[index].y, positions[index].z]}
            onImageClick={(url) => onImageClick(url, image)}
            onError={() => {
              console.warn(`Failed to load image: ${image.url}`);
            }}
          />
        </ErrorBoundary>
      ))}
    </>
  );
}