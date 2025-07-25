import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import DrafterApp from './components/DrafterApp'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DrafterApp />
  </StrictMode>,
)
