import { lazy, Suspense } from 'react'
import './App.css'

// Lazy load components for better performance
const ParentApp = lazy(() => import('./components/ParentApp'));

function App() {
  return (
    <div className="app-container">
      <Suspense fallback={<div className="loading">Loading...</div>}>
        <ParentApp />
      </Suspense>
    </div>
  )
}

export default App
