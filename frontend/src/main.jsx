import React from 'react'
import ReactDOM from 'react-dom/client'
import './i18n.js'
import App from './App.jsx'
import { ThemeProvider } from './context/theme-provider'
import './index.css'
import { recargarSiFaltaUnArchivo } from './lib/version-nueva'

// Una pestaña de una versión anterior pide archivos que el despliegue ya borró: se recarga una vez
// para traer la versión publicada (ver src/lib/version-nueva.ts).
recargarSiFaltaUnArchivo('heimdall-recargada')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme='dark'>
      <App />
    </ThemeProvider>
  </React.StrictMode>
)
