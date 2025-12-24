import { useEffect, useState, useRef } from 'react';
import './ServiceWorkerLoadingIndicator.css';
import { networkTracker } from '../../utils/networkTracker';

interface ServiceWorkerLoadingIndicatorProps {
  isVisible: boolean;
  totalImages: number;
  onLoadingComplete: () => void;
}

export function ServiceWorkerLoadingIndicator({ 
  isVisible, 
  totalImages,
  onLoadingComplete 
}: ServiceWorkerLoadingIndicatorProps) {
  const [networkProgress, setNetworkProgress] = useState({ loaded: 0, total: 0 });
  const [displayProgress, setDisplayProgress] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const targetProgressRef = useRef(0);
  
  // Track network requests (actual HTTP requests like Network tab)
  useEffect(() => {
    if (!isVisible) {
      networkTracker.reset();
      setDisplayProgress(0);
      targetProgressRef.current = 0;
      return;
    }
    
    // Reset and setup
    networkTracker.reset();
    networkTracker.setTotalExpected(totalImages);
    setNetworkProgress({ loaded: 0, total: totalImages });
    setDisplayProgress(0);
    targetProgressRef.current = 0;
    
    // Force refresh immediately and periodically
    const forceRefresh = () => {
      networkTracker.forceRefresh();
    };
    
    // Multiple immediate refreshes to catch all entries (including cached 304)
    forceRefresh(); // Immediate
    setTimeout(forceRefresh, 50);
    setTimeout(forceRefresh, 100);
    setTimeout(forceRefresh, 200);
    setTimeout(forceRefresh, 300);
    
    // Listen to network progress updates
    const handleNetworkProgress = (loaded: number, total: number) => {
      setNetworkProgress(prev => ({
        loaded: Math.max(prev.loaded, loaded), // Never go backwards
        total: total > 0 ? total : prev.total
      }));
    };
    
    networkTracker.addListener(handleNetworkProgress);
    
    // Periodic refresh to catch missed entries (more frequent)
    const refreshInterval = setInterval(forceRefresh, 100); // Every 100ms
    
    return () => {
      networkTracker.removeListener(handleNetworkProgress);
      clearInterval(refreshInterval);
    };
  }, [isVisible, totalImages]);
  
  // Update display progress based on network progress
  useEffect(() => {
    const total = networkProgress.total || totalImages;
    const loaded = networkProgress.loaded || 0;
    
    // Calculate percentage: 2% + (loaded/total) * 93%
    let target = 2;
    if (total > 0 && loaded > 0) {
      target = 2 + (loaded / total) * 93;
      target = Math.min(Math.max(target, 2), 95);
    }
    
    // Complete at 100%
    if (loaded >= total && total > 0) {
      target = 100;
    }
    
    targetProgressRef.current = target;
  }, [networkProgress.loaded, networkProgress.total, totalImages]);
  
  // Smooth animation to target progress
  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    const animate = () => {
      const target = targetProgressRef.current;
      
      setDisplayProgress(prev => {
        if (target < prev) {
          return prev; // Never go backwards
        }
        
        const diff = target - prev;
        if (Math.abs(diff) < 0.5) {
          return target;
        }
        
        // Fast interpolation
        const step = diff * 0.5;
        const newProgress = prev + step;
        const finalProgress = Math.min(Math.max(newProgress, prev), target);
        
        if (Math.abs(finalProgress - target) > 0.5) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          return target;
        }
        
        return finalProgress;
      });
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [networkProgress.loaded, networkProgress.total]);
  
  // Check for completion
  useEffect(() => {
    const loaded = networkProgress.loaded || 0;
    const total = networkProgress.total || totalImages;
    
    if (total > 0 && loaded >= total) {
      setTimeout(() => {
        onLoadingComplete();
      }, 500);
    }
  }, [networkProgress.loaded, networkProgress.total, totalImages, onLoadingComplete]);
  
  const getPhaseText = () => {
    const loaded = networkProgress.loaded || 0;
    const total = networkProgress.total || totalImages;
    
    if (loaded === 0) {
      return 'Preparing to load images...';
    } else if (loaded < total) {
      return `Loading images from network... (${loaded}/${total} requests)`;
    } else {
      return `Complete! Loaded ${total} images`;
    }
  };
  
  const getPhase = () => {
    const loaded = networkProgress.loaded || 0;
    const total = networkProgress.total || totalImages;
    
    if (loaded === 0) return 'preparing';
    if (loaded >= total && total > 0) return 'complete';
    return 'downloading';
  };
  
  const phase = getPhase();
  
  if (!isVisible) return null;

  return (
    <div className="sw-loading-overlay">
      <div className="sw-loading-container">
        <div className="sw-loading-header">
          <h3>Alzheimer's Disease Image Viewer</h3>
          <p>Downloading images from server...</p>
        </div>
        
        <div className="sw-progress-container">
          <div className="sw-progress-bar">
            <div 
              className="sw-progress-fill"
              style={{ width: `${displayProgress}%` }}
            />
          </div>
          <div className="sw-progress-text">
            {Math.round(displayProgress)}%
          </div>
        </div>
        
        <div className="sw-phase-indicator">
          <div className={`sw-phase ${phase === 'preparing' ? 'active' : phase !== 'preparing' ? 'complete' : ''}`}>
            <div className="sw-phase-dot"></div>
            <span>Preparing</span>
          </div>
          <div className={`sw-phase ${phase === 'downloading' ? 'active' : phase === 'complete' ? 'complete' : ''}`}>
            <div className="sw-phase-dot"></div>
            <span>Downloading</span>
          </div>
          <div className={`sw-phase ${phase === 'complete' ? 'active' : ''}`}>
            <div className="sw-phase-dot"></div>
            <span>Complete</span>
          </div>
        </div>
        
        <div className="sw-status-text">
          {getPhaseText()}
        </div>
        
        <div className="sw-loading-tips">
          <p>🌐 Tracking network requests (like Network tab)</p>
          <p>📊 {networkProgress.loaded || 0} of {networkProgress.total || totalImages} HTTP requests completed</p>
        </div>
      </div>
    </div>
  );
}
