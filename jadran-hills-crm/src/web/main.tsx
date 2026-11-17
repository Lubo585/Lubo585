import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AssistantProvider } from '../AssistantProvider'
import './fonts.css'
import '../index.css'
import './web.css'
import { Insecure } from './Auth'
import WebApp from './WebApp'

// Aplikácia sa spúšťa len cez zabezpečené pripojenie (https, pri vývoji aj localhost).
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {window.isSecureContext ? (
      <AssistantProvider>
        <WebApp />
      </AssistantProvider>
    ) : (
      <Insecure siteHref="../" />
    )}
  </StrictMode>,
)
