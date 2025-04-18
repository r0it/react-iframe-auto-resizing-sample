import { useState, useRef, useCallback, useEffect } from 'react';

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

interface UseIframeMessagingOptions {
  /** Mode of operation: 'parent' or 'child' */
  mode: 'parent' | 'child';
  /** URL for parent mode, or target origin for child mode */
  target?: string;
  /** Default height for parent mode */
  defaultHeight?: number;
  /** Channel ID for specific parent-child communication */
  channelId?: string;
  /** Initial loading state */
  initialLoading?: boolean;
}

interface UseIframeMessagingReturn {
  /** Reference to attach to the iframe or content container */
  ref: React.RefObject<HTMLIFrameElement | HTMLDivElement>;
  /** Current height */
  height: number;
  /** Loading state */
  loading: boolean;
  /** Set loading state */
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  /** Send a message */
  sendMessage: (message: Omit<DataMessage | ActionMessage, 'channelId'>) => void;
  /** Subscribe to messages */
  onMessage: (callback: (message: DataMessage | ActionMessage) => void) => () => void;
  /** Broadcast a message to all instances */
  broadcast: (message: Omit<DataMessage | ActionMessage, 'channelId'>) => void;
}

const useIframeMessaging = ({
  mode,
  target = '*',
  defaultHeight = 300,
  channelId,
  initialLoading = true
}: UseIframeMessagingOptions): UseIframeMessagingReturn => {
  const ref = useRef<HTMLIFrameElement | HTMLDivElement>(null);
  const [height, setHeight] = useState(defaultHeight);
  const [loading, setLoading] = useState(initialLoading);
  const messageCallbacks = useRef<((message: DataMessage | ActionMessage) => void)[]>([]);
  const broadcastChannel = useRef<BroadcastChannel | null>(null);
  const targetOrigin = mode === 'parent' ? new URL(target, window.location.origin).origin : target;

  // Handle resize
  const handleResize = useCallback((newHeight: number) => {
    setHeight(newHeight);
    setLoading(false);
  }, []);

  // Notify about height changes (child mode)
  const notifyHeight = useCallback(() => {
    if (mode === 'child' && ref.current) {
      const newHeight = (ref.current as HTMLDivElement).scrollHeight;
      window.parent.postMessage({ type: 'resize', height: newHeight, channelId }, targetOrigin);
    }
  }, [mode, targetOrigin, channelId]);

  // Send message
  const sendMessage = useCallback((message: Omit<DataMessage | ActionMessage, 'channelId'>) => {
    const fullMessage = { ...message, channelId };
    if (mode === 'parent' && (ref.current as HTMLIFrameElement)?.contentWindow) {
      (ref.current as HTMLIFrameElement).contentWindow?.postMessage(fullMessage, targetOrigin);
    } else if (mode === 'child') {
      window.parent.postMessage(fullMessage, targetOrigin);
    }
  }, [mode, targetOrigin, channelId]);

  // Subscribe to messages
  const onMessage = useCallback((callback: (message: DataMessage | ActionMessage) => void) => {
    messageCallbacks.current.push(callback);
    return () => {
      messageCallbacks.current = messageCallbacks.current.filter(cb => cb !== callback);
    };
  }, []);

  // Handle incoming messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (mode === 'parent' && event.origin !== targetOrigin) return;

      try {
        const data = event.data as IframeMessage;
        if (channelId && data.channelId !== channelId) return;

        switch (data.type) {
          case 'resize':
            if (mode === 'parent' && typeof data.height === 'number') {
              handleResize(data.height);
            }
            break;
          case 'data':
          case 'action':
            messageCallbacks.current.forEach(callback => callback(data));
            break;
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [mode, targetOrigin, channelId, handleResize]);

  // Set up resize observer (child mode)
  useEffect(() => {
    if (mode !== 'child' || !ref.current) return;

    const resizeObserver = new ResizeObserver(notifyHeight);
    resizeObserver.observe(ref.current);
    notifyHeight();

    return () => {
      if (ref.current) resizeObserver.unobserve(ref.current);
      resizeObserver.disconnect();
    };
  }, [mode, notifyHeight]);

  // Set up broadcast channel
  useEffect(() => {
    if (!channelId) return;

    broadcastChannel.current = new BroadcastChannel(channelId);
    const handleBroadcast = (event: MessageEvent) => {
      try {
        const data = event.data as IframeMessage;
        if (data.type === 'data' || data.type === 'action') {
          messageCallbacks.current.forEach(callback => callback(data));
        }
      } catch (error) {
        console.error('Error processing broadcast:', error);
      }
    };

    broadcastChannel.current.addEventListener('message', handleBroadcast);
    return () => {
      broadcastChannel.current?.removeEventListener('message', handleBroadcast);
      broadcastChannel.current?.close();
    };
  }, [channelId]);

  // Broadcast message
  const broadcast = useCallback((message: Omit<DataMessage | ActionMessage, 'channelId'>) => {
    if (broadcastChannel.current) {
      broadcastChannel.current.postMessage({ ...message, channelId });
    }
  }, [channelId]);

  return {
    ref: ref as React.RefObject<any>,
    height,
    loading,
    setLoading,
    sendMessage,
    onMessage,
    broadcast
  };
};

export default useIframeMessaging;