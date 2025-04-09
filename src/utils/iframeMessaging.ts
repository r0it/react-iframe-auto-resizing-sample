/**
 * Utility for iframe messaging between parent and child components
 * 
 * This utility provides types and helper functions for establishing
 * bidirectional communication between parent and child iframes
 * with support for multiple parent-child pairs.
 */

// Message types for different actions
export enum MessageType {
  RESIZE = 'resize',
  DATA = 'data',
  ACTION = 'action',
  REQUEST = 'request',
  RESPONSE = 'response'
}

// Base interface for all messages
export interface BaseMessage {
  type: MessageType;
  channelId: string; // Unique identifier for parent-child pair
  timestamp?: number;
}

// Resize message (from child to parent)
export interface ResizeMessage extends BaseMessage {
  type: MessageType.RESIZE;
  height: number;
}

// Data message (can be sent in either direction)
export interface DataMessage<T = any> extends BaseMessage {
  type: MessageType.DATA;
  payload: T;
}

// Action message (typically from parent to child)
export interface ActionMessage extends BaseMessage {
  type: MessageType.ACTION;
  action: string;
  payload?: any;
}

// Request message (for request-response pattern)
export interface RequestMessage extends BaseMessage {
  type: MessageType.REQUEST;
  requestId: string;
  action: string;
  payload?: any;
}

// Response message (for request-response pattern)
export interface ResponseMessage extends BaseMessage {
  type: MessageType.RESPONSE;
  requestId: string;
  success: boolean;
  payload?: any;
  error?: string;
}

// Union type for all message types
export type IframeMessage = 
  | ResizeMessage
  | DataMessage
  | ActionMessage
  | RequestMessage
  | ResponseMessage;

/**
 * Generate a unique channel ID for parent-child communication
 * 
 * @param prefix - Optional prefix for the channel ID
 * @returns A unique channel ID string
 */
export const generateChannelId = (prefix = 'iframe-channel'): string => {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}-${Date.now()}`;
};

/**
 * Validate the origin of a message event
 * 
 * @param event - The message event to validate
 * @param allowedOrigin - The allowed origin (or '*' for any origin)
 * @returns Whether the message is from an allowed origin
 */
export const isValidMessageOrigin = (event: MessageEvent, allowedOrigin: string): boolean => {
  if (allowedOrigin === '*') return true;
  
  // For relative URLs, use window.location.origin as base
  const origin = new URL(allowedOrigin, window.location.origin).origin;
  return event.origin === origin;
};

/**
 * Create a message with the specified type and payload
 * 
 * @param type - The message type
 * @param channelId - The channel ID for the message
 * @param payload - The message payload
 * @returns A properly formatted message object
 */
export const createMessage = <T extends BaseMessage>(type: MessageType, channelId: string, payload: Omit<T, 'type' | 'channelId' | 'timestamp'>): T => {
  return {
    type,
    channelId,
    timestamp: Date.now(),
    ...payload
  } as T;
};