import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AssistantProvider } from '../AssistantProvider'
import './fonts.css'
import '../index.css'
import './web.css'
import WebApp from './WebApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AssistantProvider>
      <WebApp />
    </AssistantProvider>
  </StrictMode>,
)
