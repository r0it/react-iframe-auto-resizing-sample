import { useState, useRef, useCallback, useEffect } from 'react';
import {
  MessageType,
  IframeMessage,
  BaseMessage,
  isValidMessageOrigin,
  createMessage,
  DataMessage,
  ActionMessage,
  RequestMessage,
  ResponseMessage,
  ResizeMessage
} from '../utils/iframeMessaging';

// Type definitions for the hook props
export interface UseIframeContentMessagingOptions {
  /** Initial loading state */
  initialLoading?: boolean;
  /** Target origin for postMessage (default: '*') */
  targetOrigin?: string;
  /** Optional callback for handling specific message types */
  onMessage?: (message: IframeMessage) => void;
  /** Optional callback for handling action messages */
  onAction?: (action: string, payload?: any) => void | Promise<any>;
}

// Type definitions for the hook return value
export interface UseIframeContentMessagingReturn {
  /** Reference to attach to the content container */
  contentRef: React.RefObject<HTMLDivElement>;
  /** Current loading state */
  loading: boolean;
  /** Set loading state */
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  /** Channel ID for this parent-child communication */
  channelId: string | null;
  /** Send a data message to the parent */
  sendData: <T = any>(data: T) => void;
  /** Send a response to a request from the parent */
  sendResponse: (requestId: string, payload?: any, error?: string) => void;
  /** Register action handlers for specific actions */
  registerActionHandler: (action: string, handler: (payload?: any) => any | Promise<any>) => () => void;
}

/**
 * Custom hook for bidirectional communication from within an iframe
 * 
 * This hook provides methods for sending messages to and receiving messages from
 * the parent window, with support for resize events, data transfer, actions, and
 * request-response patterns.
 * 
 * @param options - Configuration options
 * @returns Object containing content reference, messaging methods, and state
 */
const useIframeContentMessaging = ({
  initialLoading = false,
  targetOrigin = '*',
  onMessage,
  onAction
}: UseIframeContentMessagingOptions = {}): UseIframeContentMessagingReturn => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(initialLoading);
  const [channelId, setChannelId] = useState<string | null>(null);
  
  // Store action handlers
  const actionHandlersRef = useRef<Map<string, (payload?: any) => any | Promise<any>>>(new Map());
  
  // Function to notify parent about height changes
  const notifyParentAboutHeight = useCallback(() => {
    if (!contentRef.current || !channelId) return;
    
    const height = contentRef.current.scrollHeight;
    // Send message to parent with the current height
    const message = createMessage<ResizeMessage>(MessageType.RESIZE, channelId, { height });
    window.parent.postMessage(message, targetOrigin);
  }, [channelId, targetOrigin]);
  
  // Send a message to the parent window
  const sendMessage = useCallback(<T extends BaseMessage>(
    type: MessageType,
    payload: Omit<T, 'type' | 'channelId' | 'timestamp'>
  ) => {
    if (!channelId) return;
    
    const message = createMessage<T>(type, channelId, payload);
    window.parent.postMessage(message, targetOrigin);
  }, [channelId, targetOrigin]);
  
  // Send a data message to the parent
  const sendData = useCallback(<T = any>(data: T) => {
    sendMessage<DataMessage<T>>(MessageType.DATA, { payload: data });
  }, [sendMessage]);
  
  // Send a response to a request from the parent
  const sendResponse = useCallback((requestId: string, payload?: any, error?: string) => {
    sendMessage<ResponseMessage>(MessageType.RESPONSE, {
      requestId,
      success: !error,
      payload,
      error
    });
  }, [sendMessage]);
  
  // Register an action handler
  const registerActionHandler = useCallback((action: string, handler: (payload?: any) => any | Promise<any>) => {
    actionHandlersRef.current.set(action, handler);
    
    // Return a function to unregister the handler
    return () => {
      actionHandlersRef.current.delete(action);
    };
  }, []);
  
  // Handle messages from the parent
  const handleMessage = useCallback(async (event: MessageEvent) => {
    // Security check: validate message origin
    if (!isValidMessageOrigin(event, targetOrigin)) return;
    
    try {
      const message = event.data as IframeMessage;
      
      // Handle initialization message to set channel ID
      if (!channelId && message.type === MessageType.DATA) {
        const dataMsg = message as DataMessage;
        if (dataMsg.payload && dataMsg.payload.init && dataMsg.payload.channelId) {
          setChannelId(dataMsg.payload.channelId);
          return;
        }
      }
      
      // Verify this message is for our channel
      if (!channelId || message.channelId !== channelId) return;
      
      // Handle different message types
      switch (message.type) {
        case MessageType.ACTION:
          const actionMsg = message as ActionMessage;
          const { action, payload } = actionMsg;
          
          // Check for registered handler
          const handler = actionHandlersRef.current.get(action);
          if (handler) {
            try {
              const result = await handler(payload);
              // If this was a request-action, send back the result
              if ('requestId' in message) {
                const requestMsg = message as unknown as RequestMessage;
                sendResponse(requestMsg.requestId, result);
              }
            } catch (error) {
              if ('requestId' in message) {
                const requestMsg = message as unknown as RequestMessage;
                sendResponse(requestMsg.requestId, undefined, error instanceof Error ? error.message : String(error));
              }
              console.error(`Error handling action '${action}':`, error);
            }
          } else if (onAction) {
            // Fall back to onAction prop
            try {
              const result = await onAction(action, payload);
              // If this was a request-action, send back the result
              if ('requestId' in message) {
                const requestMsg = message as unknown as RequestMessage;
                sendResponse(requestMsg.requestId, result);
              }
            } catch (error) {
              if ('requestId' in message) {
                const requestMsg = message as unknown as RequestMessage;
                sendResponse(requestMsg.requestId, undefined, error instanceof Error ? error.message : String(error));
              }
            }
          } else if ('requestId' in message) {
            // No handler found for this request
            const requestMsg = message as unknown as RequestMessage;
            sendResponse(requestMsg.requestId, undefined, `No handler registered for action '${action}'`);
          }
          break;
          
        case MessageType.REQUEST:
          const requestMsg = message as RequestMessage;
          const { action: requestAction, payload: requestPayload } = requestMsg;
          
          // Check for registered handler
          const requestHandler = actionHandlersRef.current.get(requestAction);
          if (requestHandler) {
            try {
              const result = await requestHandler(requestPayload);
              sendResponse(requestMsg.requestId, result);
            } catch (error) {
              sendResponse(requestMsg.requestId, undefined, error instanceof Error ? error.message : String(error));
            }
          } else if (onAction) {
            // Fall back to onAction prop
            try {
              const result = await onAction(requestAction, requestPayload);
              sendResponse(requestMsg.requestId, result);
            } catch (error) {
              sendResponse(requestMsg.requestId, undefined, error instanceof Error ? error.message : String(error));
            }
          } else {
            // No handler found for this request
            sendResponse(requestMsg.requestId, undefined, `No handler registered for action '${requestAction}'`);
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
      console.error('Error processing message from parent:', error);
    }
  }, [channelId, targetOrigin, onMessage, onAction, sendResponse]);
  
  // Set up resize observer to detect content changes
  useEffect(() => {
    if (!contentRef.current || !channelId) return;
    
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
  }, [notifyParentAboutHeight, channelId]);
  
  // Notify parent when loading state changes
  useEffect(() => {
    if (!loading && channelId) {
      // Small delay to ensure content is fully rendered
      setTimeout(notifyParentAboutHeight, 0);
    }
  }, [loading, notifyParentAboutHeight, channelId]);
  
  // Set up and clean up event listener
  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);
  
  return {
    contentRef: contentRef as React.RefObject<HTMLDivElement>,
    loading,
    setLoading,
    channelId,
    sendData,
    sendResponse,
    registerActionHandler
  };
};

export default useIframeContentMessaging;