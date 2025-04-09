import React, { useState, useEffect, useCallback } from 'react';
import useIframeContentMessaging from '../hooks/useIframeContentMessaging';
import '../styles/ChildApp.css';

// Type for message history display
interface MessageHistoryItem {
  direction: 'sent' | 'received';
  type: string;
  content: string;
  timestamp: number;
}

const ChildMessagingExample = () => {
  // State for message history and theme
  const [messageHistory, setMessageHistory] = useState<MessageHistoryItem[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [counter, setCounter] = useState(0);
  
  // Initialize the messaging hook
  const { 
    contentRef, 
    loading, 
    setLoading,
    channelId,
    sendData,
    registerActionHandler 
  } = useIframeContentMessaging({
    initialLoading: true,
    onMessage: (message) => {
      // Add received message to history
      if (message.type === 'data') {
        addMessageToHistory('received', 'DATA', JSON.stringify(message.payload));
      }
    },
    onAction: async (action: string, payload?: any): Promise<any> => {
      // Handle action messages
      addMessageToHistory('received', 'ACTION', `${action} ${payload ? JSON.stringify(payload) : ''}`);
      
      // Handle specific actions
      if (action === 'TOGGLE_THEME') {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
        return { success: true, previousTheme: theme };
      }
      
      if (action === 'INCREMENT') {
        setCounter(prev => prev + 1);
        return { success: true, newValue: counter + 1 };
      }
      
      if (action === 'DECREMENT') {
        setCounter(prev => prev - 1);
        return { success: true, newValue: counter - 1 };
      }
      
      return { success: false, error: `Unknown action: ${action}` };
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

  // Register handlers for specific requests
  useEffect(() => {
    // Handler for GET_DATA request
    const getDataHandler = registerActionHandler('GET_DATA', () => {
      return {
        timestamp: Date.now(),
        counter,
        theme,
        message: 'Data from child component'
      };
    });
    
    // Handler for RESET_COUNTER request
    const resetCounterHandler = registerActionHandler('RESET_COUNTER', () => {
      setCounter(0);
      return { success: true, newValue: 0 };
    });
    
    // Clean up handlers when component unmounts
    return () => {
      getDataHandler();
      resetCounterHandler();
    };
  }, [registerActionHandler, counter, theme]);

  // Simulate loading data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setLoading(false);
      
      // Send initial data to parent
      if (channelId) {
        sendData({ initialized: true, timestamp: Date.now() });
        addMessageToHistory('sent', 'DATA', JSON.stringify({ initialized: true, timestamp: Date.now() }));
      }
    };
    
    loadData();
  }, [setLoading, channelId, sendData, addMessageToHistory]);

  // Send data to parent
  const handleSendData = useCallback(() => {
    const data = {
      counter,
      theme,
      timestamp: Date.now(),
      message: 'Hello from child component!'
    };
    
    sendData(data);
    addMessageToHistory('sent', 'DATA', JSON.stringify(data));
  }, [counter, theme, sendData, addMessageToHistory]);

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div 
      ref={contentRef} 
      className={`child-container ${theme}`}
      style={{ 
        backgroundColor: theme === 'light' ? '#f8f9fa' : '#343a40',
        color: theme === 'light' ? '#212529' : '#f8f9fa',
        padding: '20px',
        transition: 'all 0.3s ease'
      }}
    >
      <h1>Child Iframe Component</h1>
      <p>Channel ID: {channelId || 'Not connected yet'}</p>
      
      {loading && <div className="loading">Loading content...</div>}
      
      <div className="child-controls" style={{ marginBottom: '20px' }}>
        <div className="counter-display" style={{ 
          padding: '10px', 
          border: '1px solid #ccc',
          borderRadius: '4px',
          marginBottom: '10px',
          textAlign: 'center',
          fontSize: '24px'
        }}>
          Counter: {counter}
        </div>
        
        <div className="theme-display" style={{ 
          padding: '10px', 
          border: '1px solid #ccc',
          borderRadius: '4px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          Current Theme: {theme}
        </div>
        
        <button 
          onClick={handleSendData}
          style={{ 
            padding: '8px 16px',
            backgroundColor: theme === 'light' ? '#007bff' : '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Send Data to Parent
        </button>
      </div>
      
      <div className="message-history" style={{ 
        maxHeight: '300px', 
        overflowY: 'auto',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '10px',
        backgroundColor: theme === 'light' ? 'white' : '#495057'
      }}>
        <h3>Message History</h3>
        {messageHistory.length === 0 ? (
          <p>No messages yet</p>
        ) : (
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {messageHistory.map((msg, index) => (
              <li 
                key={index} 
                style={{ 
                  padding: '8px',
                  margin: '4px 0',
                  borderRadius: '4px',
                  backgroundColor: msg.direction === 'sent' 
                    ? (theme === 'light' ? '#e2f0ff' : '#0d47a1') 
                    : (theme === 'light' ? '#f0f0f0' : '#424242'),
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <span style={{ fontWeight: 'bold' }}>{formatTime(msg.timestamp)}</span>
                <span>{msg.direction === 'sent' ? '→' : '←'}</span>
                <span style={{ 
                  backgroundColor: msg.type === 'DATA' 
                    ? '#28a745' 
                    : msg.type === 'ACTION' 
                      ? '#fd7e14' 
                      : '#dc3545',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>{msg.type}</span>
                <span style={{ wordBreak: 'break-word', flexGrow: 1 }}>{msg.content}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <div style={{ marginTop: '20px', fontSize: '12px', opacity: 0.7 }}>
        <p>Available actions: TOGGLE_THEME, INCREMENT, DECREMENT</p>
        <p>Available requests: GET_DATA, RESET_COUNTER</p>
      </div>
    </div>
  );
};

export default ChildMessagingExample;