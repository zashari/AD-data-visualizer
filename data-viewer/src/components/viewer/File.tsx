
import { useTexture, Billboard } from '@react-three/drei';
import { useRef, useState, useEffect } from 'react';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';

interface FileProps {
  imageUrl: string;
  position: [number, number, number];
  onImageClick?: (imageUrl: string, imageData?: any) => void;
  onLoad?: () => void;
  onError?: () => void;
}

export function File({ imageUrl, position, onImageClick, onLoad, onError, ...props }: FileProps) {
  const ref = useRef<THREE.Mesh>(null!);
  const texture = useTexture(imageUrl);
  const [hovered, hover] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const hasNotifiedLoad = useRef(false);

  // Track actual texture loading - more aggressive detection for cached images
  useEffect(() => {
    if (!texture || hasNotifiedLoad.current) return;
    
    const img = texture.image;
    
    // Immediate check for already-loaded images (cached images)
    const checkLoaded = () => {
      if (hasNotifiedLoad.current) return;
      
      if (img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
        setIsLoaded(true);
        hasNotifiedLoad.current = true;
        onLoad?.();
        return true;
      }
      return false;
    };
    
    // Check immediately
    if (checkLoaded()) {
      return;
    }
    
    // If image exists but not loaded yet, set up listeners
    if (img) {
      const handleLoad = () => {
        if (!hasNotifiedLoad.current) {
          setIsLoaded(true);
          hasNotifiedLoad.current = true;
          onLoad?.();
        }
      };
      
      const handleError = () => {
        if (!hasNotifiedLoad.current) {
          hasNotifiedLoad.current = true;
          onError?.();
        }
      };
      
      // Add event listeners
      img.addEventListener('load', handleLoad, { once: true });
      img.addEventListener('error', handleError, { once: true });
      
      // Aggressive polling for cached images (check every 50ms)
      const checkInterval = setInterval(() => {
        if (checkLoaded()) {
          clearInterval(checkInterval);
        }
      }, 50);
      
      // Cleanup
      return () => {
        img.removeEventListener('load', handleLoad);
        img.removeEventListener('error', handleError);
        clearInterval(checkInterval);
      };
    } else {
      // Texture exists but image not yet available, poll until it appears
      const checkImageInterval = setInterval(() => {
        if (texture.image) {
          clearInterval(checkImageInterval);
          // Now check if it's loaded
          if (checkLoaded()) {
            return;
          }
          // Set up listeners for the new image
          const newImg = texture.image;
          const handleLoad = () => {
            if (!hasNotifiedLoad.current) {
              setIsLoaded(true);
              hasNotifiedLoad.current = true;
              onLoad?.();
            }
          };
          newImg.addEventListener('load', handleLoad, { once: true });
        }
      }, 50);
      
      // Timeout after 2 seconds
      const timeout = setTimeout(() => {
        clearInterval(checkImageInterval);
        // Final check
        if (texture.image && !hasNotifiedLoad.current) {
          checkLoaded();
        }
      }, 2000);
      
      return () => {
        clearInterval(checkImageInterval);
        clearTimeout(timeout);
      };
    }
  }, [texture, onLoad, onError]);

  // Spring animation for hover effect
  const springs = useSpring({
    scale: hovered ? 1.1 : 1,
    positionZ: hovered ? 0.2 : 0,
    config: { tension: 300, friction: 20 }
  });

  const handleClick = () => {
    if (onImageClick) {
      // Pass image data along with URL
      const imageData = {
        name: imageUrl.split('/').pop()?.split('?')[0] || 'Unknown',
        width: texture?.image?.width || 0,
        height: texture?.image?.height || 0,
        url: imageUrl
      };
      onImageClick(imageUrl, imageData);
    }
  };

  return (
    <Billboard
      {...props}
      position={position}
      follow={true} // Always face the camera
      lockX={false} // Allow rotation around X axis
      lockY={false} // Allow rotation around Y axis
      lockZ={false} // Allow rotation around Z axis
    >
      <animated.mesh
        ref={ref}
        scale={springs.scale}
        position-z={springs.positionZ}
        onClick={handleClick}
        onPointerOver={() => hover(true)}
        onPointerOut={() => hover(false)}
      >
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial map={texture} color={texture ? 'white' : 'gray'} />
      </animated.mesh>
    </Billboard>
  );
}
