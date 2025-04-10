import { memo, useCallback } from 'react';
import useIframeResize from '../hooks/useIframeResize';
import '../styles/ParentApp.css';

// Define iframe configuration type
interface IframeConfig {
  id: string;
  url: string;
  title: string;
}

// Message type definitions
interface DataMessage {
  type: 'data';
  payload: any;
}

interface ActionMessage {
  type: 'action';
  action: string;
  payload?: any;
}

// Memoized IFrame component to prevent unnecessary re-renders
const ChildIframe = memo(({ url, title, iframeRef, onResize, channelId }: { 
  url: string; 
  title: string; 
  iframeRef: React.RefObject<HTMLIFrameElement>;
  onResize: (height: number) => void;
  channelId: string;
}) => {
  return (
    <iframe
      ref={iframeRef}
      src={`${url}${url.includes('?') ? '&' : '?'}channelId=${channelId}`}
      title={title}
      className="child-iframe"
      sandbox="allow-scripts allow-same-origin"
    />
  );
});

// Display name for debugging
ChildIframe.displayName = 'ChildIframe';

const ParentApp = () => {
  // Define multiple iframe configurations
  const iframeConfigs: IframeConfig[] = [
    { id: 'iframe1', url: '/child', title: 'Child Application 1' },
    { id: 'iframe2', url: '/child', title: 'Child Application 2' },
  ];

  // Create a map to store the useIframeResize hooks for each iframe
  const iframeHooks = iframeConfigs.map(config => {
    return {
      config,
      hook: useIframeResize({
        url: config.url,
        defaultHeight: 300,
        channelId: config.id
      })
    };
  });

  // Handle messages from child iframes
  const handleMessage = useCallback((message: DataMessage | ActionMessage, channelId: string) => {
    console.log(`Received message from ${channelId}:`, message);
    
    if (message.type === 'action') {
      switch (message.action) {
        case 'refresh':
          // Handle refresh action
          console.log(`Refreshing iframe ${channelId}`);
          break;
        // Add more action handlers as needed
      }
    } else if (message.type === 'data') {
      // Handle data messages
      console.log(`Received data from ${channelId}:`, message.payload);
    }
  }, []);

  // Send message to a specific child iframe
  const sendMessage = useCallback((channelId: string, message: Omit<DataMessage | ActionMessage, 'channelId'>) => {
    const iframe = iframeHooks.find(({ config }) => config.id === channelId);
    if (iframe?.hook.sendMessage) {
      iframe.hook.sendMessage(message);
    }
  }, [iframeHooks]);

  // Example: Send a message to all iframes
  const broadcastMessage = useCallback((message: Omit<DataMessage | ActionMessage, 'channelId'>) => {
    iframeHooks.forEach(({ config }) => {
      sendMessage(config.id, message);
    });
  }, [sendMessage]);

  return (
    <div className="parent-container">
      <h1>Parent Application</h1>
      <p>This demonstrates multiple iframes with auto-resizing when content changes.</p>
      
      {iframeHooks.map(({ config, hook }) => {
        const { iframeRef, iframeHeight, loading, handleIframeResize } = hook;
        
        return (
          <div key={config.id} className="iframe-container" style={{ 
            height: loading ? '300px' : `${iframeHeight}px`,
            marginBottom: '20px'
          }}>
            <h2>{config.title}</h2>
            {loading && <div className="loading-indicator">Loading iframe content...</div>}
            <ChildIframe 
              url={config.url} 
              title={config.title} 
              iframeRef={iframeRef}
              onResize={handleIframeResize}
              channelId={config.id}
            />
            <div className="info-panel">
              <p>Current iframe height: {iframeHeight}px</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ParentApp;