import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { ScheduleProvider } from './context/ScheduleContext'
import { CorrectionsProvider } from './context/CorrectionsContext'
import { LibraryProvider } from './context/LibraryContext'
import App from './App'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ThemeProvider>
            <AuthProvider>
                <ScheduleProvider>
                    <CorrectionsProvider>
                        <LibraryProvider>
                            <BrowserRouter>
                                <App />
                            </BrowserRouter>
                        </LibraryProvider>
                    </CorrectionsProvider>
                </ScheduleProvider>
            </AuthProvider>
        </ThemeProvider>
    </React.StrictMode>,
)
