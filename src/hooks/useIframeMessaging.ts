import { useState, useRef, useCallback, useEffect } from 'react';
import {
  MessageType,
  IframeMessage,
  BaseMessage,
  isValidMessageOrigin,
  createMessage,
  generateChannelId,
  DataMessage,
  ActionMessage,
  RequestMessage,
  ResponseMessage,
  ResizeMessage
} from '../utils/iframeMessaging';

// Type definitions for the hook props
export interface UseIframeMessagingProps {
  /** URL of the iframe content */
  url: string;
  /** Default height for the iframe */
  defaultHeight?: number;
  /** Channel ID for this parent-child pair (generated if not provided) */
  channelId?: string;
  /** Target origin for postMessage (default: derived from URL) */
  targetOrigin?: string;
  /** Optional callback for handling specific message types */
  onMessage?: (message: IframeMessage) => void;
}

// Type definitions for the hook return value
export interface UseIframeMessagingReturn {
  /** Reference to the iframe element */
  iframeRef: React.RefObject<HTMLIFrameElement>;
  /** Current height of the iframe */
  iframeHeight: number;
  /** Loading state of the iframe */
  loading: boolean;
  /** Channel ID for this parent-child communication */
  channelId: string;
  /** Send a data message to the child iframe */
  sendData: <T = any>(data: T) => void;
  /** Send an action message to the child iframe */
  sendAction: (action: string, payload?: any) => void;
  /** Send a request to the child iframe and get a promise for the response */
  sendRequest: <T = any>(action: string, payload?: any) => Promise<T>;
  /** Handle iframe resize */
  handleIframeResize: (height: number) => void;
}

/**
 * Custom hook for bidirectional communication with an iframe
 * 
 * This hook provides methods for sending messages to and receiving messages from
 * a child iframe, with support for resize events, data transfer, actions, and
 * request-response patterns.
 * 
 * @param props - Configuration options
 * @returns Object containing iframe reference, messaging methods, and state
 */
const useIframeMessaging = ({
  url,
  defaultHeight = 300,
  channelId: providedChannelId,
  targetOrigin: providedTargetOrigin,
  onMessage
}: UseIframeMessagingProps): UseIframeMessagingReturn => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(defaultHeight);
  const [loading, setLoading] = useState(true);
  
  // Generate a unique channel ID if not provided
  const [channelId] = useState(() => providedChannelId || generateChannelId());
  
  // Store pending requests for request-response pattern
  const pendingRequestsRef = useRef<Map<string, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    timeout: ReturnType<typeof setTimeout>;
  }>>(new Map());

  // Determine target origin from URL if not provided
  const targetOrigin = providedTargetOrigin || new URL(url, window.location.origin).origin;

  // Handle iframe resize
  const handleIframeResize = useCallback((height: number) => {
    setIframeHeight(height);
    // Ensure loading is set to false when we receive a resize message
    setLoading(false);
  }, []);

  // Send a message to the child iframe
  const sendMessage = useCallback(<T extends BaseMessage>(
    type: MessageType,
    payload: Omit<T, 'type' | 'channelId' | 'timestamp'>
  ) => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;

    const message = createMessage<T>(type, channelId, payload);
    iframeRef.current.contentWindow.postMessage(message, targetOrigin);
  }, [channelId, targetOrigin]);

  // Send a data message to the child iframe
  const sendData = useCallback(<T = any>(data: T) => {
    sendMessage<DataMessage<T>>(MessageType.DATA, { payload: data });
  }, [sendMessage]);

  // Send an action message to the child iframe
  const sendAction = useCallback((action: string, payload?: any) => {
    sendMessage<ActionMessage>(MessageType.ACTION, { action, payload });
  }, [sendMessage]);

  // Send a request to the child iframe and get a promise for the response
  const sendRequest = useCallback(<T = any>(
    action: string,
    payload?: any,
    timeoutMs: number = 5000
  ): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      // Generate a unique request ID
      const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Set up timeout for the request
      const timeout = setTimeout(() => {
        const request = pendingRequestsRef.current.get(requestId);
        if (request) {
          pendingRequestsRef.current.delete(requestId);
          reject(new Error(`Request timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);
      
      // Store the request handlers
      pendingRequestsRef.current.set(requestId, {
        resolve,
        reject,
        timeout
      });
      
      // Send the request message
      sendMessage<RequestMessage>(MessageType.REQUEST, {
        requestId,
        action,
        payload
      });
    });
  }, [sendMessage]);

  // Handle messages from the iframe
  const handleMessage = useCallback((event: MessageEvent) => {
    // Security check: only accept messages from our iframe's URL
    if (!isValidMessageOrigin(event, targetOrigin)) return;

    try {
      const message = event.data as IframeMessage;
      
      // Verify this message is for our channel
      if (message.channelId !== channelId) return;
      
      // Handle different message types
      switch (message.type) {
        case MessageType.RESIZE:
          if (typeof (message as ResizeMessage).height === 'number') {
            handleIframeResize((message as ResizeMessage).height);
          }
          break;
          
        case MessageType.RESPONSE:
          const responseMsg = message as ResponseMessage;
          const request = pendingRequestsRef.current.get(responseMsg.requestId);
          
          if (request) {
            clearTimeout(request.timeout);
            pendingRequestsRef.current.delete(responseMsg.requestId);
            
            if (responseMsg.success) {
              request.resolve(responseMsg.payload);
            } else {
              request.reject(new Error(responseMsg.error || 'Unknown error'));
            }
          }
          break;
          
        default:
          // Forward other message types to the onMessage callback if provided
          if (onMessage) {
            onMessage(message);
          }
          break;
      }
    } catch (error) {
      console.error('Error processing message from iframe:', error);
    }
  }, [channelId, targetOrigin, handleIframeResize, onMessage]);

  // Set up and clean up event listener
  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => {
      // Clean up event listener and any pending requests
      window.removeEventListener('message', handleMessage);
      
      // Clear all pending request timeouts
      pendingRequestsRef.current.forEach(request => {
        clearTimeout(request.timeout);
      });
      pendingRequestsRef.current.clear();
    };
  }, [handleMessage]);

  // When iframe loads, send the channel ID to it
  useEffect(() => {
    const handleIframeLoad = () => {
      // Short delay to ensure the iframe content is ready
      setTimeout(() => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
          // Send initialization message with channel ID
          sendData({ init: true, channelId });
        }
      }, 100);
    };
    
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.addEventListener('load', handleIframeLoad);
      return () => {
        iframe.removeEventListener('load', handleIframeLoad);
      };
    }
  }, [channelId, sendData]);

  return {
    iframeRef: iframeRef as React.RefObject<HTMLIFrameElement>,
    iframeHeight,
    loading,
    channelId,
    sendData,
    sendAction,
    sendRequest,
    handleIframeResize
  };
};

export default useIframeMessaging;