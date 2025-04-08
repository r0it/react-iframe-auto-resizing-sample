# React Iframe Auto-Resize Sample

This project demonstrates an optimized approach to automatically resize iframes based on their content using React and TypeScript. It showcases a parent-child iframe relationship where the iframe's height dynamically adjusts to fit its content without scrollbars or cutoffs.

## Features

- **Automatic iframe resizing** - Iframe height adjusts dynamically as content changes
- **Bidirectional communication** - Secure postMessage API for parent-child communication
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

## Technical Implementation

### Communication Mechanism

The parent and child communicate using the browser's `postMessage` API:

1. The child component measures its content height using a ResizeObserver
2. When content changes, it sends a message to the parent with the new height
3. The parent receives the message, verifies its origin, and updates the iframe height

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
