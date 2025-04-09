# React Iframe Communication & Auto-Resize Sample

This project demonstrates an optimized approach to working with iframes in React and TypeScript. It showcases two key functionalities:

1. **Auto-resizing iframes** - Dynamically adjust iframe height to fit content without scrollbars
2. **Two-way communication system** - Robust bidirectional messaging between parent and child iframes

## Features

- **Automatic iframe resizing** - Iframe height adjusts dynamically as content changes
- **Bidirectional communication** - Secure postMessage API for parent-child communication
- **Multiple message types** - Support for data, actions, and request-response patterns
- **Channel-based routing** - Unique channel IDs for multiple parent-child pairs
- **Loading state management** - Visual feedback during content loading
- **TypeScript support** - Full type safety throughout the application
- **Performance optimized** - Uses ResizeObserver and memoization for efficient updates
- **Responsive design** - Works across different screen sizes

## Demo

The application consists of two main components:

1. **Parent Application** - Contains the iframe and displays its current height
2. **Child Application** - The content inside the iframe that can dynamically change

When you click "Load More Content" in the child application, the iframe automatically resizes to accommodate the new content.

## Installation

```bash
# Clone the repository
git clone [repository-url]
cd react-iframe-sample

# Install dependencies
npm install

# Start the development server
npm run dev
```

## Auto-Resize System

The auto-resizing functionality is implemented using two custom hooks:

### 1. useIframeResize (Parent Hook)

This hook is used in the parent component that contains the iframe. It:

- Sets up event listeners for messages from the child iframe
- Updates the iframe height based on messages received
- Manages loading state
- Implements security checks for message origin

```typescript
const { iframeRef, iframeHeight, loading, handleIframeResize } = useIframeResize({
  url: '/child',
  defaultHeight: 300
});
```

### 2. useIframeContentResize (Child Hook)

This hook is used in the child component inside the iframe. It:

- Uses ResizeObserver to detect content size changes
- Sends height information to the parent via postMessage
- Manages loading state for dynamic content
- Ensures height updates after content changes

```typescript
const { contentRef, loading, setLoading } = useIframeContentResize({
  initialLoading: true
});
```

## Two-Way Communication System

The messaging system enables robust bidirectional communication between parent and child iframes.

### System Components

1. **Messaging Utilities** - Types and helper functions for message handling
2. **Parent Hook** - `useIframeMessaging` for parent components
3. **Child Hook** - `useIframeContentMessaging` for child components

### Key Messaging Features

- **Bidirectional Communication** - Send and receive messages in both directions
- **Multiple Message Types** - Support for data, actions, and request-response patterns
- **Channel-Based Routing** - Unique channel IDs for multiple parent-child pairs
- **Type Safety** - Full TypeScript support for all message types
- **Optimized Rendering** - Uses React's memoization to prevent unnecessary re-renders

### Usage Examples

#### Parent Component

```tsx
import { memo } from 'react';
import useIframeMessaging from '../hooks/useIframeMessaging';

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
      data-channel-id={channelId} // Optional: store channelId as data attribute
    />
  );
});

ChildIframe.displayName = 'ChildIframe';

const ParentComponent = () => {
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
    url: '/child-route',
    defaultHeight: 300,
    onMessage: (message) => {
      // Handle messages from child
      console.log('Message from child:', message);
    }
  });

  // Send data to child
  const handleSendData = () => {
    sendData({ greeting: 'Hello from parent!' });
  };

  // Send action to child
  const handleSendAction = () => {
    sendAction('TOGGLE_THEME');
  };

  // Send request to child and wait for response
  const handleSendRequest = async () => {
    try {
      const response = await sendRequest('GET_DATA', { id: 123 });
      console.log('Response from child:', response);
    } catch (error) {
      console.error('Error from child:', error);
    }
  };

  return (
    <div className="parent-container">
      <h1>Parent Application</h1>
      
      <div className="iframe-container" style={{ height: loading ? '300px' : `${iframeHeight}px` }}>
        {loading && <div className="loading-indicator">Loading iframe content...</div>}
        <ChildIframe 
          url="/child-route" 
          title="Child Application" 
          iframeRef={iframeRef}
          channelId={channelId}
        />
      </div>
      
      <div className="controls">
        <button onClick={handleSendData}>Send Data</button>
        <button onClick={handleSendAction}>Send Action</button>
        <button onClick={handleSendRequest}>Send Request</button>
      </div>
    </div>
  );
};
```

#### Child Component

```tsx
import { useState } from 'react';
import useIframeContentMessaging from '../hooks/useIframeContentMessaging';

const ChildComponent = () => {
  const [theme, setTheme] = useState('light');
  const [messages, setMessages] = useState<string[]>([]);
  
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
      // Handle general messages
      if (message.type === 'data') {
        setMessages(prev => [...prev, JSON.stringify(message.payload)]);
      }
    },
    onAction: (action, payload) => {
      // Handle action messages
      console.log(`Received action: ${action}`, payload);
      
      if (action === 'TOGGLE_THEME') {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
        return true; // Return value will be sent back for requests
      }
    }
  });
  
  // Register a handler for a specific action
  // This is an alternative to using the onAction prop
  useState(() => {
    const unregister = registerActionHandler('GET_DATA', (payload) => {
      console.log('GET_DATA action received with payload:', payload);
      // Return data that will be sent back to parent
      return {
        timestamp: Date.now(),
        data: { id: payload?.id, value: 'Some data from child' }
      };
    });
    
    // Clean up handler when component unmounts
    return unregister;
  }, [registerActionHandler]);
  
  // Simulate loading data
  useState(() => {
    const loadData = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLoading(false);
    };
    
    loadData();
  }, [setLoading]);
  
  // Send data to parent
  const handleSendToParent = () => {
    sendData({ message: 'Hello from child!', timestamp: Date.now() });
  };
  
  return (
    <div 
      ref={contentRef} 
      className={`child-container ${theme}`}
      data-channel-id={channelId || 'not-connected'} // Optional: for debugging
    >
      <h1>Child Application</h1>
      <p>Channel ID: {channelId || 'Not connected yet'}</p>
      
      {loading && <div className="loading">Loading...</div>}
      
      <button onClick={handleSendToParent}>Send Message to Parent</button>
      
      <div className="received-messages">
        <h3>Received Messages:</h3>
        {messages.length === 0 ? (
          <p>No messages received yet</p>
        ) : (
          <ul>
            {messages.map((msg, index) => (
              <li key={index}>{msg}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
```

## Technical Implementation

### Communication Mechanism

The parent and child communicate using the browser's `postMessage` API:

1. The child component measures its content height using a ResizeObserver
2. When content changes, it sends a message to the parent with the new height
3. The parent receives the message, verifies its origin, and updates the iframe height

### Multiple Parent-Child Pairs

When using multiple iframe pairs on the same page:

1. Each parent-child pair should have a unique channel ID
2. Use the `channelId` prop to specify a custom ID, or let the hook generate one
3. Store the channel ID in a data attribute for debugging purposes

```tsx
// Parent component with multiple iframes
const MultiIframeParent = () => {
  // First iframe messaging hook
  const firstIframe = useIframeMessaging({
    url: '/child1',
    channelId: 'iframe-first' // Custom channel ID
  });
  
  // Second iframe messaging hook
  const secondIframe = useIframeMessaging({
    url: '/child2',
    // Let the hook generate a unique channel ID
  });
  
  return (
    <div>
      <ChildIframe 
        url="/child1" 
        title="First Child" 
        iframeRef={firstIframe.iframeRef}
        channelId={firstIframe.channelId}
      />
      
      <ChildIframe 
        url="/child2" 
        title="Second Child" 
        iframeRef={secondIframe.iframeRef}
        channelId={secondIframe.channelId}
      />
    </div>
  );
};
```

### Optimization Techniques

- **ResizeObserver** - Modern API that efficiently detects size changes without polling
- **Memoization** - The iframe component is memoized to prevent unnecessary re-renders
- **Lazy Loading** - Components are loaded lazily for better initial load performance
- **Debounced Updates** - Height updates are slightly delayed to ensure content is fully rendered
- **Origin Verification** - Security check to only accept messages from trusted sources
- **useCallback** - Used for event handlers to prevent unnecessary re-renders
- **Batched Updates** - Group multiple updates together when possible

### Security Best Practices

1. Always validate message origins to prevent cross-site scripting attacks
2. Use specific targetOrigin instead of '*' when possible
3. Use the sandbox attribute on iframes to restrict capabilities
4. Validate message data before processing

## Use Cases

- Embedding dynamic content from the same domain
- Creating isolated components that need to fit their content
- Building embedded widgets or tools
- Implementing content previews
- Complex parent-child communication scenarios
- Multiple iframe coordination

## License

MIT
