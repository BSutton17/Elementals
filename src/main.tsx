import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { registerGlobalErrorHandlers } from './util/errorHandler'

// Install global browser error handlers before the app renders.
registerGlobalErrorHandlers()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {/* Real URLs, so the phone's back gesture leaves the shop instead of the
          site, and /profile survives a refresh. Deep links need the SPA
          rewrite in public/_redirects to work on Netlify. */}
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
