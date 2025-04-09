import React, { useState, memo, useCallback } from 'react';
import useIframeMessaging from '../hooks/useIframeMessaging';
import '../styles/MessagingExample.css';

// Type for message history display
interface MessageHistoryItem {
  direction: 'sent' | 'received';
  type: string;
  content: string;
  timestamp: number;
}

// Memoized IFrame component to prevent unnecessary re-renders
const ChildIframe = memo(({ url, title, iframeRef, channelId }: { 
  url: string; 
  title: string; 
  iframeRef: React.RefObject<HTMLIFrameElement>;
  channelId: string;
}) => {
  return (
    <iframe
      ref={iframeRef}
      src={url}
      title={title}
      className="child-iframe"
      sandbox="allow-scripts allow-same-origin"
      data-channel-id={channelId} // Store channelId as data attribute for debugging
    />
  );
});

// Display name for debugging
ChildIframe.displayName = 'ChildIframe';

const MessagingExample = () => {
  // State for message history
  const [messageHistory, setMessageHistory] = useState<MessageHistoryItem[]>([]);
  const [actionInput, setActionInput] = useState('');
  const [dataInput, setDataInput] = useState('');
  const [requestInput, setRequestInput] = useState('');
  
  // Initialize the messaging hook
  const { 
    iframeRef, 
    iframeHeight, 
    loading, 
    channelId,
    sendData,
    sendAction,
    sendRequest 
  } = useIframeMessaging({
    url: '/child-messaging-example',
    defaultHeight: 300,
    onMessage: (message) => {
      // Add received message to history
      if (message.type === 'data') {
        addMessageToHistory('received', 'DATA', JSON.stringify(message.payload));
      }
    }
  });

  // Add message to history
  const addMessageToHistory = useCallback((direction: 'sent' | 'received', type: string, content: string) => {
    setMessageHistory(prev => [
      ...prev,
      {
        direction,
        type,
        content,
        timestamp: Date.now()
      }
    ]);
  }, []);

  // Send data to child
  const handleSendData = useCallback(() => {
    try {
      // Parse JSON input or use as string if parsing fails
      let payload;
      try {
        payload = JSON.parse(dataInput);
      } catch {
        payload = dataInput;
      }
      
      sendData(payload);
      addMessageToHistory('sent', 'DATA', JSON.stringify(payload));
      setDataInput('');
    } catch (error) {
      console.error('Error sending data:', error);
    }
  }, [dataInput, sendData, addMessageToHistory]);

  // Send action to child
  const handleSendAction = useCallback(() => {
    if (!actionInput) return;
    
    sendAction(actionInput);
    addMessageToHistory('sent', 'ACTION', actionInput);
    setActionInput('');
  }, [actionInput, sendAction, addMessageToHistory]);

  // Send request to child and wait for response
  const handleSendRequest = useCallback(async () => {
    if (!requestInput) return;
    
    try {
      addMessageToHistory('sent', 'REQUEST', requestInput);
      const response = await sendRequest(requestInput);
      addMessageToHistory('received', 'RESPONSE', JSON.stringify(response));
      setRequestInput('');
    } catch (error) {
      addMessageToHistory('received', 'ERROR', error instanceof Error ? error.message : String(error));
    }
  }, [requestInput, sendRequest, addMessageToHistory]);

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="messaging-example">
      <h1>Iframe Messaging Example</h1>
      <p>Channel ID: {channelId}</p>
      
      <div className="iframe-container" style={{ height: loading ? '300px' : `${iframeHeight}px` }}>
        {loading && <div className="loading-indicator">Loading iframe content...</div>}
        <ChildIframe 
          url="/child-messaging-example" 
          title="Child Application" 
          iframeRef={iframeRef}
          channelId={channelId}
        />
      </div>
      
      <div className="messaging-controls">
        <div className="control-section">
          <h3>Send Data</h3>
          <div className="input-group">
            <input 
              type="text" 
              value={dataInput} 
              onChange={(e) => setDataInput(e.target.value)} 
              placeholder="Enter data (string or JSON)"
            />
            <button onClick={handleSendData}>Send Data</button>
          </div>
        </div>
        
        <div className="control-section">
          <h3>Send Action</h3>
          <div className="input-group">
            <input 
              type="text" 
              value={actionInput} 
              onChange={(e) => setActionInput(e.target.value)} 
              placeholder="Enter action name"
            />
            <button onClick={handleSendAction}>Send Action</button>
          </div>
        </div>
        
        <div className="control-section">
          <h3>Send Request</h3>
          <div className="input-group">
            <input 
              type="text" 
              value={requestInput} 
              onChange={(e) => setRequestInput(e.target.value)} 
              placeholder="Enter request action"
            />
            <button onClick={handleSendRequest}>Send Request</button>
          </div>
        </div>
      </div>
      
      <div className="message-history">
        <h3>Message History</h3>
        {messageHistory.length === 0 ? (
          <p>No messages yet</p>
        ) : (
          <ul>
            {messageHistory.map((msg, index) => (
              <li 
                key={index} 
                className={`message ${msg.direction} ${msg.type.toLowerCase()}`}
              >
                <span className="time">{formatTime(msg.timestamp)}</span>
                <span className="direction">{msg.direction === 'sent' ? '→' : '←'}</span>
                <span className="type">{msg.type}</span>
                <span className="content">{msg.content}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MessagingExample;