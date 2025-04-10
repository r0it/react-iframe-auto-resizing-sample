import { useState, useRef, useCallback, useEffect } from 'react';

// Type definitions for message events
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
  sendMessage: (message: Omit<DataMessage | ActionMessage, 'channelId'>) => void;
  onMessage: (callback: (message: DataMessage | ActionMessage) => void) => () => void;
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
  const messageCallbacks = useRef<((message: DataMessage | ActionMessage) => void)[]>([]);

  // Handle iframe resize
  const handleIframeResize = useCallback((height: number) => {
    setIframeHeight(height);
    // Ensure loading is set to false when we receive a resize message
    setLoading(false);
  }, []);

  // Send message to child iframe
  const sendMessage = useCallback((message: Omit<DataMessage | ActionMessage, 'channelId'>) => {
    if (iframeRef.current?.contentWindow) {
      const fullMessage = { ...message, channelId };
      const iframeUrl = new URL(url, window.location.origin);
      iframeRef.current.contentWindow.postMessage(fullMessage, iframeUrl.origin);
    }
  }, [url, channelId]);

  // Subscribe to messages
  const onMessage = useCallback((callback: (message: DataMessage | ActionMessage) => void) => {
    messageCallbacks.current.push(callback);
    return () => {
      messageCallbacks.current = messageCallbacks.current.filter(cb => cb !== callback);
    };
  }, []);

  // Handle messages from the iframe
  const handleMessage = useCallback((event: MessageEvent) => {
    // Security check: only accept messages from our iframe's URL
    // Use window.location.origin as base for relative URLs
    const iframeUrl = new URL(url, window.location.origin);
    if (event.origin !== iframeUrl.origin) return;

    try {
      const data = event.data as IframeMessage;
      
      // If channelId is specified, only process messages for this channel
      if (channelId && data.channelId !== channelId) {
        return;
      }

      // Handle different message types
      switch (data.type) {
        case 'resize':
          if (typeof data.height === 'number') {
            handleIframeResize(data.height);
          }
          break;
        case 'data':
        case 'action':
          messageCallbacks.current.forEach(callback => callback(data));
          break;
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
    handleIframeResize,
    sendMessage,
    onMessage
  };
};

export default useIframeResize;