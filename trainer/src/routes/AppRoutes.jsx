import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout'
import Login from '../pages/Login'
import { useAuth } from '../context/AuthContext'
import Dashboard from '../portals/trainer/pages/Dashboard'
import Clients from '../portals/trainer/pages/Clients'
import ClientProfile from '../portals/trainer/pages/ClientProfile'
import Schedule from '../portals/trainer/pages/Schedule'
import DietPlans from '../portals/trainer/pages/DietPlans'
import ExercisePlans from '../portals/trainer/pages/ExercisePlans'
import FollowUps from '../portals/trainer/pages/FollowUps'
import Messages from '../portals/trainer/pages/Messages'
import NotificationsPage from '../portals/trainer/pages/NotificationsPage'
import Settings from '../portals/trainer/pages/Settings'
import NotFound from '../pages/NotFound'

export default function AppRoutes() {
    const { authed } = useAuth()

    return (
        <Routes>
            <Route path="/login" element={authed ? <Navigate to="/" replace /> : <Login />} />
            <Route element={authed ? <AppLayout /> : <Navigate to="/login" replace />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/clients/:id" element={<ClientProfile />} />
                <Route path="/schedule" element={<Schedule />} />
                <Route path="/diet-plans" element={<DietPlans />} />
                <Route path="/exercise-plans" element={<ExercisePlans />} />
                <Route path="/follow-ups" element={<FollowUps />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/404" element={<NotFound />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
            </Route>
        </Routes>
    )
}
