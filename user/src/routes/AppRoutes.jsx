import { Routes, Route, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import AppLayout from '../layouts/AppLayout'
import Login from '../pages/Login'
import SetPassword from '../pages/SetPassword'
import { useAuth } from '../context/AuthContext'
import Dashboard from '../portals/client/pages/Dashboard'
import MyDiet from '../portals/client/pages/MyDiet'
import MyExercises from '../portals/client/pages/MyExercises'
import WorkoutRunner from '../portals/client/pages/WorkoutRunner'
import MySchedule from '../portals/client/pages/MySchedule'
import MyProgress from '../portals/client/pages/MyProgress'
import Messages from '../portals/client/pages/Messages'
import MyRequests from '../portals/client/pages/MyRequests'
import NotificationsPage from '../portals/client/pages/NotificationsPage'
import Profile from '../portals/client/pages/Profile'
import Settings from '../portals/client/pages/Settings'
import NotFound from '../pages/NotFound'

export default function AppRoutes() {
    const { authed, loading, user } = useAuth()
    const mustChangePassword = !!user?.mustChangePassword

    if (loading) {
        return <div className="flex min-h-screen items-center justify-center"><Spin size="large" /></div>
    }

    return (
        <Routes>
            <Route path="/login" element={authed ? <Navigate to="/" replace /> : <Login />} />
            <Route
                path="/set-password"
                element={authed ? (mustChangePassword ? <SetPassword /> : <Navigate to="/" replace />) : <Navigate to="/login" replace />}
            />
            <Route element={authed ? (mustChangePassword ? <Navigate to="/set-password" replace /> : <AppLayout />) : <Navigate to="/login" replace />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/diet" element={<MyDiet />} />
                <Route path="/exercises" element={<MyExercises />} />
                <Route path="/workout" element={<WorkoutRunner />} />
                <Route path="/schedule" element={<MySchedule />} />
                <Route path="/progress" element={<MyProgress />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/requests" element={<MyRequests />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/404" element={<NotFound />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
            </Route>
        </Routes>
    )
}
