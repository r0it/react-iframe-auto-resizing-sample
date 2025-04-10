import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Custom hook for observing content height changes and notifying parent iframe
 * 
 * @param options - Configuration options
 * @returns Object containing content reference and loading state
 */
interface UseIframeContentResizeOptions {
  /** Initial loading state */
  initialLoading?: boolean;
  /** Target origin for postMessage (default: '*') */
  targetOrigin?: string;
  /** Channel ID for identifying specific parent-child communication */
  channelId?: string;
}

interface UseIframeContentResizeReturn {
  /** Reference to attach to the content container */
  contentRef: React.RefObject<HTMLDivElement>;
  /** Current loading state */
  loading: boolean;
  /** Set loading state */
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const useIframeContentResize = ({
  initialLoading = false,
  targetOrigin = '*',
  channelId
}: UseIframeContentResizeOptions = {}): UseIframeContentResizeReturn => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(initialLoading);
  
  // Function to notify parent about height changes
  const notifyParentAboutHeight = useCallback(() => {
    if (contentRef.current) {
      const height = contentRef.current.scrollHeight;
      // Send message to parent with the current height and channelId for identification
      window.parent.postMessage({ type: 'resize', height, channelId }, targetOrigin);
    }
  }, [targetOrigin, channelId]);
  
  // Set up resize observer to detect content changes
  useEffect(() => {
    if (!contentRef.current) return;
    
    // Create ResizeObserver to monitor size changes
    const resizeObserver = new ResizeObserver(() => {
      notifyParentAboutHeight();
    });
    
    // Start observing the content element
    resizeObserver.observe(contentRef.current);
    
    // Initial height notification
    notifyParentAboutHeight();
    
    // Clean up observer on unmount
    return () => {
      if (contentRef.current) {
        resizeObserver.unobserve(contentRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [notifyParentAboutHeight]);
  
  // Notify parent when loading state changes
  useEffect(() => {
    if (!loading) {
      // Small delay to ensure content is fully rendered
      setTimeout(notifyParentAboutHeight, 0);
    }
  }, [loading, notifyParentAboutHeight]);
  
  return {
    contentRef: contentRef as React.RefObject<HTMLDivElement>,
    loading,
    setLoading
  };
};

export default useIframeContentResize;