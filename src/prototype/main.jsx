import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PivotPrototype } from './PivotPrototype'
import '../styles/globals.css'
import './prototype.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PivotPrototype />
  </StrictMode>
)
