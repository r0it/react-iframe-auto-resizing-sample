import { useState, useRef, useCallback, useEffect } from 'react';

// Type definitions for message events
interface IframeMessage {
  type: 'resize';
  height: number;
  channelId?: string;
}

interface UseIframeResizeProps {
  url: string;
  defaultHeight?: number;
  channelId?: string;
}

interface UseIframeResizeReturn {
  iframeRef: React.RefObject<HTMLIFrameElement>;
  iframeHeight: number;
  loading: boolean;
  handleIframeResize: (height: number) => void;
}

/**
 * Custom hook for handling iframe height resizing
 * 
 * @param url - The URL of the iframe content
 * @param defaultHeight - Default height for the iframe (default: 300)
 * @returns Object containing iframe reference, current height, loading state, and resize handler
 */
const useIframeResize = (props: UseIframeResizeProps): UseIframeResizeReturn => {
  const { url, defaultHeight = 300, channelId } = props;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(defaultHeight);
  const [loading, setLoading] = useState(true);

  // Handle iframe resize
  const handleIframeResize = useCallback((height: number) => {
    setIframeHeight(height);
    // Ensure loading is set to false when we receive a resize message
    setLoading(false);
  }, []);

  // Handle messages from the iframe
  const handleMessage = useCallback((event: MessageEvent) => {
    // Security check: only accept messages from our iframe's URL
    // Use window.location.origin as base for relative URLs
    const iframeUrl = new URL(url, window.location.origin);
    if (event.origin !== iframeUrl.origin) return;

    try {
      const data = event.data as IframeMessage;
      
      // Handle resize message
      if (data.type === 'resize' && typeof data.height === 'number') {
        // If channelId is specified, only process messages for this channel
        if (props.channelId && data.channelId !== props.channelId) {
          return;
        }
        handleIframeResize(data.height);
      }
    } catch (error) {
      console.error('Error processing message from iframe:', error);
    }
  }, [url, handleIframeResize, props.channelId]);

  // Set up and clean up event listener
  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);

  return {
    iframeRef: iframeRef as React.RefObject<HTMLIFrameElement>,
    iframeHeight,
    loading,
    handleIframeResize
  };
};

export default useIframeResize;