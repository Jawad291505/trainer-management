import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { LibraryProvider } from './context/LibraryContext'
import App from './App'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ThemeProvider>
            <AuthProvider>
                <LibraryProvider>
                    <BrowserRouter>
                        <App />
                    </BrowserRouter>
                </LibraryProvider>
            </AuthProvider>
        </ThemeProvider>
    </React.StrictMode>,
)
