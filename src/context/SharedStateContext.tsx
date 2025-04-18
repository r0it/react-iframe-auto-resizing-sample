import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

// Define the shape of our shared state
interface SharedState {
  data: Record<string, any>;
  lastUpdated: string | null;
  lastUpdatedBy: string | null;
}

// Define the actions that can modify our shared state
type SharedStateAction =
  | { type: 'UPDATE_STATE'; payload: { key: string; value: any; source: string } }
  | { type: 'CLEAR_STATE' };

// Create the context
const SharedStateContext = createContext<{
  state: SharedState;
  dispatch: React.Dispatch<SharedStateAction>;
  updateState: (key: string, value: any) => void;
  clearState: () => void;
} | null>(null);

// Initial state
const initialState: SharedState = {
  data: {},
  lastUpdated: null,
  lastUpdatedBy: null,
};

// Reducer function to handle state updates
function sharedStateReducer(state: SharedState, action: SharedStateAction): SharedState {
  switch (action.type) {
    case 'UPDATE_STATE':
      return {
        data: {
          ...state.data,
          [action.payload.key]: action.payload.value,
        },
        lastUpdated: new Date().toISOString(),
        lastUpdatedBy: action.payload.source,
      };
    case 'CLEAR_STATE':
      return initialState;
    default:
      return state;
  }
}

// Provider component
export const SharedStateProvider: React.FC<{
  children: React.ReactNode;
  isParent?: boolean;
}> = ({ children, isParent = false }) => {
  const [state, dispatch] = useReducer(sharedStateReducer, initialState);
  const [searchParams] = useSearchParams();
  const defaultSource = window.location.origin;
  const channelId = isParent ? 'parent' : searchParams.get('channelId');
  const sourceIdentifier = channelId ? `${defaultSource}/${channelId}` : defaultSource;

  // Handle incoming messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data.type === 'shared_state_update') {
        dispatch({
          type: 'UPDATE_STATE',
          payload: {
            key: data.key,
            value: data.value,
            source: data.source,
          },
        });
      } else if (data.type === 'shared_state_clear') {
        dispatch({ type: 'CLEAR_STATE' });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Helper function to update state
  const updateState = useCallback(
    (key: string, value: any) => {
      // Update local state
      dispatch({
        type: 'UPDATE_STATE',
        payload: { key, value, source: sourceIdentifier },
      });

      // Broadcast to other frames
      const message = {
        type: 'shared_state_update',
        key,
        value,
        source: sourceIdentifier,
      };

      if (isParent) {
        // Parent broadcasts to all iframes
        const iframes = document.getElementsByTagName('iframe');
        Array.from(iframes).forEach((iframe) => {
          iframe.contentWindow?.postMessage(message, '*');
        });
      } else {
        // Child sends to parent
        window.parent.postMessage(message, '*');
      }
    },
    [channelId, isParent]
  );

  // Helper function to clear state
  const clearState = useCallback(() => {
    dispatch({ type: 'CLEAR_STATE' });
    const message = { type: 'shared_state_clear' };

    if (isParent) {
      const iframes = document.getElementsByTagName('iframe');
      Array.from(iframes).forEach((iframe) => {
        iframe.contentWindow?.postMessage(message, '*');
      });
    } else {
      window.parent.postMessage(message, '*');
    }
  }, [isParent]);

  return (
    <SharedStateContext.Provider value={{ state, dispatch, updateState, clearState }}>
      {children}
    </SharedStateContext.Provider>
  );
};

// Custom hook to use the shared state
export const useSharedState = () => {
  const context = useContext(SharedStateContext);
  if (!context) {
    throw new Error('useSharedState must be used within a SharedStateProvider');
  }
  return context;
};