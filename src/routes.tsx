import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';

// Import App component
const App = lazy(() => import('./App'));

// Lazy load components for better performance
const ParentApp = lazy(() => import('./components/ParentApp'));
const ChildApp = lazy(() => import('./components/ChildApp'));
const MessagingExample = lazy(() => import('./examples/MessagingExample'));
const ChildMessagingExample = lazy(() => import('./examples/ChildMessagingExample'));

// Create router configuration
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <ParentApp />
      }
    ]
  },
  {
    path: '/messaging-example',
    element: <MessagingExample />
  },
  // Standalone routes for iframe content
  {
    path: '/child',
    element: <ChildApp />
  },
  {
    path: '/child-messaging-example',
    element: <ChildMessagingExample />
  }
]);

export default router;