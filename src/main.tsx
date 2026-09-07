import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/index.css'
import './styles/batterySaver.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { registerGlobalErrorHandlers } from './util/errorHandler'
import { initDisplaySettings } from './game/displaySettings'

// Install global browser error handlers before the app renders.
registerGlobalErrorHandlers()

// ⚠️ BEFORE THE FIRST RENDER, NOT IN AN EFFECT. Battery saver is an attribute on
// <html> that the stylesheets read, and the heaviest things it turns off — the
// ability bar's glass, the full-screen overlays — are painted outside the React
// root. Applied from an effect, every load would flash the expensive version
// first, which is the one thing a player on a hot phone asked not to see.
initDisplaySettings()

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
