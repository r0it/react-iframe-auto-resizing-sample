# React Iframe Auto-Resize Sample

This project demonstrates an optimized approach to automatically resize iframes based on their content using React and TypeScript. It showcases a parent-child iframe relationship where the iframe's height dynamically adjusts to fit its content without scrollbars or cutoffs.

## Features

- **Automatic iframe resizing** - Iframe height adjusts dynamically as content changes
- **Advanced Messaging System** - Rich messaging API supporting data sharing and action triggers
- **Multiple iframe support** - Isolated communication channels for multiple iframes
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

## How It Works

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
  defaultHeight: 300,
  channelId: 'unique-iframe-id'  // Optional: for multiple iframe support
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
  initialLoading: true,
  channelId: 'unique-iframe-id'  // Optional: for multiple iframe support
});
```

## Technical Implementation

### Communication Mechanism

The parent and child communicate using an enhanced `postMessage` API that supports multiple message types:

#### Message Types

1. **Resize Messages** - Automatic height adjustment:
   - Child measures content height using ResizeObserver
   - Sends height information to parent
   - Parent verifies and updates iframe height

2. **Data Messages** - Share data between parent and child:
   ```typescript
   // From child to parent
   sendMessage({
     type: 'data',
     payload: { /* your data */ }
   });

   // From parent to specific child
   sendMessage(channelId, {
     type: 'data',
     payload: { /* your data */ }
   });
   ```

3. **Action Messages** - Trigger specific behaviors:
   ```typescript
   // From parent to child
   sendMessage(channelId, {
     type: 'action',
     action: 'clear'
   });

   // From child to parent
   sendMessage({
     type: 'action',
     action: 'refresh'
   });
   ```

#### Message Handling

- Parent and child components can subscribe to messages using the `onMessage` callback
- Messages are automatically filtered by channelId for multiple iframe support
- Type-safe message handling with TypeScript interfaces

### Multiple Iframe Support

The application supports multiple iframes with isolated communication channels:

1. Each iframe is assigned a unique `channelId` to identify its messages
2. The parent component passes the `channelId` to both the iframe URL and the resize hook
3. The child component extracts the `channelId` from URL parameters
4. Messages include the `channelId` to ensure they're processed by the correct parent-child pair

```typescript
// Parent component setup
const iframeConfigs = [
  { id: 'iframe1', url: '/child', title: 'Child Application 1' },
  { id: 'iframe2', url: '/child', title: 'Child Application 2' },
];

// Create a hook instance for each iframe
const iframeHooks = iframeConfigs.map(config => ({
  config,
  hook: useIframeResize({
    url: config.url,
    defaultHeight: 300,
    channelId: config.id  // Pass unique channel ID
  })
}));
```

```typescript
// Child component setup
const [searchParams] = useSearchParams();
const channelId = searchParams.get('channelId');

const { contentRef, loading, setLoading } = useIframeContentResize({
  initialLoading: true,
  channelId: channelId || undefined  // Use channel ID from URL
});
```

### Optimization Techniques

- **ResizeObserver** - Modern API that efficiently detects size changes without polling
- **Memoization** - The iframe component is memoized to prevent unnecessary re-renders
- **Lazy Loading** - Components are loaded lazily for better initial load performance
- **Debounced Updates** - Height updates are slightly delayed to ensure content is fully rendered
- **Origin Verification** - Security check to only accept messages from trusted sources

### Best Practices

- **Type Safety** - Comprehensive TypeScript interfaces for all props and state
- **Clean Separation** - Logic extracted into reusable hooks
- **Error Handling** - Proper error boundaries and fallbacks
- **Performance** - Optimized rendering and event handling
- **Security** - Proper sandbox attributes and origin verification

## Use Cases

- Embedding dynamic content from the same domain
- Creating isolated components that need to fit their content
- Building embedded widgets or tools
- Implementing content previews

## License

MIT
