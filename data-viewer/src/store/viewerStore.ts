import { create } from 'zustand';
import { type FilterState } from '../types/index';

interface ViewerState {
  filters: FilterState;
  selectedImage: string | null;
  selectedImageData: any;
  isLoading: boolean;
  isServiceWorkerLoading: boolean;
  isFilterSidebarOpen: boolean;
  loadingProgress: { loaded: number; total: number };
  setFilters: (filters: FilterState) => void;
  setSelectedImage: (url: string | null, data?: any) => void;
  setIsLoading: (loading: boolean) => void;
  setServiceWorkerLoading: (loading: boolean) => void;
  setFilterSidebarOpen: (open: boolean) => void;
  toggleFilterSidebar: () => void;
  clearSelectedImage: () => void;
  setLoadingProgress: (loaded: number, total: number) => void;
}

export const useViewerStore = create<ViewerState>((set, get) => ({
  filters: {
    plane: 'axial', // Default to axial plane
    version: null,
    class: null,
    subset: null
  },
  selectedImage: null,
  selectedImageData: null,
  isLoading: true,
  isServiceWorkerLoading: true,
  isFilterSidebarOpen: false,
  loadingProgress: { loaded: 0, total: 0 },
  
  setFilters: (filters: FilterState) => set(() => ({ 
    filters, 
    isLoading: true,
    isServiceWorkerLoading: true,
    loadingProgress: { loaded: 0, total: 0 } // Reset progress on filter change
  })),
  
  setSelectedImage: (url: string | null, data?: any) => set({ 
    selectedImage: url, 
    selectedImageData: data 
  }),
  
  setIsLoading: (loading: boolean) => set({ isLoading: loading }),
  
  setServiceWorkerLoading: (loading: boolean) => set({ isServiceWorkerLoading: loading }),
  
  setFilterSidebarOpen: (open: boolean) => set({ isFilterSidebarOpen: open }),
  
  toggleFilterSidebar: () => set((state) => ({ 
    isFilterSidebarOpen: !state.isFilterSidebarOpen 
  })),
  
  clearSelectedImage: () => set({ 
    selectedImage: null, 
    selectedImageData: null 
  }),
  
  // Ensure progress only increases (monotonic) - never goes backwards
  setLoadingProgress: (loaded: number, total: number) => {
    const current = get().loadingProgress;
    // Only update if new loaded count is greater than current (prevent regression)
    const newLoaded = Math.max(current.loaded, Math.min(loaded, total));
    const newTotal = total > 0 ? total : current.total;
    
    // Only update if there's actual progress or total changed
    if (newLoaded > current.loaded || newTotal !== current.total) {
      set({ 
        loadingProgress: { 
          loaded: newLoaded, 
          total: newTotal 
        } 
      });
    }
  }
}));