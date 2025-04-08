import { memo } from 'react';
import useIframeResize from '../hooks/useIframeResize';
import '../styles/ParentApp.css';

// Memoized IFrame component to prevent unnecessary re-renders
const ChildIframe = memo(({ url, title, iframeRef, onResize }: { 
  url: string; 
  title: string; 
  iframeRef: React.RefObject<HTMLIFrameElement>;
  onResize: (height: number) => void;
}) => {
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
  // Use our custom hook for iframe resizing
  const { iframeRef, iframeHeight, loading, handleIframeResize } = useIframeResize({
    url: '/child',
    defaultHeight: 300
  });

  return (
    <div className="parent-container">
      <h1>Parent Application</h1>
      <p>This demonstrates iframe auto-resizing when child content changes.</p>
      
      <div className="iframe-container" style={{ height: loading ? '300px' : `${iframeHeight}px` }}>
        {loading && <div className="loading-indicator">Loading iframe content...</div>}
        <ChildIframe 
          url="/child" 
          title="Child Application" 
          iframeRef={iframeRef}
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