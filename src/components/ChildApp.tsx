import { useState, useEffect, useCallback } from 'react';
import useIframeContentResize from '../hooks/useIframeContentResize';
import '../styles/ChildApp.css';

// Type definition for the content item
interface ContentItem {
  id: number;
  title: string;
  content: string;
}

const ChildApp = () => {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Use our custom hook for iframe content resizing
  const { contentRef, loading, setLoading } = useIframeContentResize({
    initialLoading: true
  });
  
  // Simulate fetching data with a delay to demonstrate dynamic content loading
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Simulate API call with timeout
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock data
        const mockData: ContentItem[] = [
          { id: 1, title: 'Section 1', content: 'This is the content for section 1. It demonstrates how the iframe can resize based on content.' },
          { id: 2, title: 'Section 2', content: 'Here is some more content for section 2. The parent iframe will automatically adjust to fit this content.' },
        ];
        
        setContent(mockData);
        setError(null);
      } catch (err) {
        setError('Failed to load content');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [setLoading]);
  
  // Load more content button handler
  const handleLoadMore = () => {
    setLoading(true);
    
    // Simulate loading delay
    setTimeout(() => {
      const newItem: ContentItem = {
        id: content.length + 1,
        title: `Section ${content.length + 1}`,
        content: `This is dynamically loaded content for section ${content.length + 1}. Notice how the iframe automatically resizes to accommodate this new content. This demonstrates the effective communication between the child iframe and parent container.`
      };
      
      setContent(prev => [...prev, newItem]);
      setLoading(false);
    }, 800);
  };
  
  return (
    <div className="child-container" ref={contentRef}>
      <h1>Child Application</h1>
      <p className="description">
        This is the content inside the iframe. As this content grows or shrinks, 
        the iframe will automatically resize to fit it perfectly.
      </p>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="content-section">
        {content.map(item => (
          <div key={item.id} className="content-item">
            <h2>{item.title}</h2>
            <p>{item.content}</p>
          </div>
        ))}
      </div>
      
      {loading && <div className="loading">Loading content...</div>}
      
      <button 
        className="load-more-button" 
        onClick={handleLoadMore}
        disabled={loading}
      >
        {loading ? 'Loading...' : 'Load More Content'}
      </button>
    </div>
  );
};

export default ChildApp;