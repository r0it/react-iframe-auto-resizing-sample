import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';

// Lazy load components for better performance
const ParentApp = lazy(() => import('./components/ParentApp'));
const ChildApp = lazy(() => import('./components/ChildApp'));

// Create router configuration
const router = createBrowserRouter([
  {
    path: '/',
    element: <ParentApp />
  },
  {
    path: '/child',
    element: <ChildApp />
  }
]);

export default router;