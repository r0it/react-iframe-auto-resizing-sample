import { useState, useRef, useCallback, useEffect, memo } from 'react';
import '../styles/ParentApp.css';

// Type definitions for message events
interface IframeMessage {
  type: 'resize';
  height: number;
}

// Memoized IFrame component to prevent unnecessary re-renders
const ChildIframe = memo(({ url, title, onResize }: { 
  url: string; 
  title: string; 
  onResize: (height: number) => void;
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

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
        onResize(data.height);
      }
    } catch (error) {
      console.error('Error processing message from iframe:', error);
    }
  }, [url, onResize]);

  // Set up and clean up event listener
  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);

  return (
    <iframe
      ref={iframeRef}
      src={url}
      title={title}
      className="child-iframe"
      sandbox="allow-scripts allow-same-origin"
    />
  );
});

// Display name for debugging
ChildIframe.displayName = 'ChildIframe';

const ParentApp = () => {
  const [iframeHeight, setIframeHeight] = useState(300); // Default height
  const [loading, setLoading] = useState(true);

  // Handle iframe resize
  const handleIframeResize = useCallback((height: number) => {
    setIframeHeight(height);
    // Ensure loading is set to false when we receive a resize message
    setLoading(false);
  }, []);

  return (
    <div className="parent-container">
      <h1>Parent Application</h1>
      <p>This demonstrates iframe auto-resizing when child content changes.</p>
      
      <div className="iframe-container" style={{ height: loading ? '300px' : `${iframeHeight}px` }}>
        {loading && <div className="loading-indicator">Loading iframe content...</div>}
        <ChildIframe 
          url="/child" 
          title="Child Application" 
          onResize={handleIframeResize} 
        />
      </div>
      
      <div className="info-panel">
        <h2>Current iframe height: {iframeHeight}px</h2>
        <p>The iframe automatically resizes based on its content.</p>
      </div>
    </div>
  );
};

export default ParentApp;