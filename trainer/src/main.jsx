import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import UserScope from './context/UserScope'
import { ScheduleProvider } from './context/ScheduleContext'
import { CorrectionsProvider } from './context/CorrectionsContext'
import { BadgesProvider } from './context/BadgesContext'
import { ProgressPhotosProvider } from './context/ProgressPhotosContext'
import { LibraryProvider } from './context/LibraryContext'
import App from './App'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ThemeProvider>
            <AuthProvider>
                <BrowserRouter>
                    <UserScope>
                        <ScheduleProvider>
                            <CorrectionsProvider>
                                <BadgesProvider>
                                    <ProgressPhotosProvider>
                                        <LibraryProvider>
                                            <App />
                                        </LibraryProvider>
                                    </ProgressPhotosProvider>
                                </BadgesProvider>
                            </CorrectionsProvider>
                        </ScheduleProvider>
                    </UserScope>
                </BrowserRouter>
            </AuthProvider>
        </ThemeProvider>
    </React.StrictMode>,
)
