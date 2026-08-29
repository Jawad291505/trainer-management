import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { ScheduleProvider } from './context/ScheduleContext'
import { CorrectionsProvider } from './context/CorrectionsContext'
import App from './App'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ThemeProvider>
            <AuthProvider>
                <ScheduleProvider>
                    <CorrectionsProvider>
                        <BrowserRouter>
                            <App />
                        </BrowserRouter>
                    </CorrectionsProvider>
                </ScheduleProvider>
            </AuthProvider>
        </ThemeProvider>
    </React.StrictMode>,
)
