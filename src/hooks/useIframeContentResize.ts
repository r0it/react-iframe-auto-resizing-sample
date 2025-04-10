import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Custom hook for observing content height changes and notifying parent iframe
 * 
 * @param options - Configuration options
 * @returns Object containing content reference and loading state
 */
// Message type definitions
interface BaseIframeMessage {
  type: string;
  channelId?: string;
}

interface ResizeMessage extends BaseIframeMessage {
  type: 'resize';
  height: number;
}

interface DataMessage extends BaseIframeMessage {
  type: 'data';
  payload: any;
}

interface ActionMessage extends BaseIframeMessage {
  type: 'action';
  action: string;
  payload?: any;
}

type IframeMessage = ResizeMessage | DataMessage | ActionMessage;

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
  /** Send a message to the parent window */
  sendMessage: (message: Omit<DataMessage | ActionMessage, 'channelId'>) => void;
  /** Subscribe to messages from the parent */
  onMessage: (callback: (message: DataMessage | ActionMessage) => void) => () => void;
}

const useIframeContentResize = ({
  initialLoading = false,
  targetOrigin = '*',
  channelId
}: UseIframeContentResizeOptions = {}): UseIframeContentResizeReturn => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(initialLoading);
  const messageCallbacks = useRef<((message: DataMessage | ActionMessage) => void)[]>([]);
  
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
  
  // Send message to parent window
  const sendMessage = useCallback((message: Omit<DataMessage | ActionMessage, 'channelId'>) => {
    const fullMessage = { ...message, channelId };
    window.parent.postMessage(fullMessage, targetOrigin);
  }, [targetOrigin, channelId]);

  // Subscribe to messages from parent
  const onMessage = useCallback((callback: (message: DataMessage | ActionMessage) => void) => {
    messageCallbacks.current.push(callback);
    return () => {
      messageCallbacks.current = messageCallbacks.current.filter(cb => cb !== callback);
    };
  }, []);

  // Handle messages from parent
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = event.data as IframeMessage;
        
        // If channelId is specified, only process messages for this channel
        if (channelId && data.channelId !== channelId) {
          return;
        }

        if (data.type === 'data' || data.type === 'action') {
          messageCallbacks.current.forEach(callback => callback(data));
        }
      } catch (error) {
        console.error('Error processing message from parent:', error);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [channelId]);

  return {
    contentRef: contentRef as React.RefObject<HTMLDivElement>,
    loading,
    setLoading,
    sendMessage,
    onMessage
  };
};

export default useIframeContentResize;