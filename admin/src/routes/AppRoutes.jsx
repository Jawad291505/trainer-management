import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout'
import Login from '../pages/Login'
import { useAuth } from '../context/AuthContext'
import Dashboard from '../portals/admin/pages/Dashboard'
import Users from '../portals/admin/pages/Users'
import Trainers from '../portals/admin/pages/Trainers'
import TrainerDetail from '../portals/admin/pages/TrainerDetail'
import Clients from '../portals/admin/pages/Clients'
import ClientDetail from '../portals/admin/pages/ClientDetail'
import Assignments from '../portals/admin/pages/Assignments'
import Libraries from '../portals/admin/pages/Libraries'
import DietPlans from '../portals/admin/pages/DietPlans'
import Payments from '../portals/admin/pages/Payments'
import NotificationsPage from '../portals/admin/pages/NotificationsPage'
import Settings from '../portals/admin/pages/Settings'
import NotFound from '../pages/NotFound'

export default function AppRoutes() {
    const { authed } = useAuth()

    return (
        <Routes>
            <Route path="/login" element={authed ? <Navigate to="/" replace /> : <Login />} />
            <Route element={authed ? <AppLayout /> : <Navigate to="/login" replace />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/users" element={<Users />} />
                <Route path="/trainers" element={<Trainers />} />
                <Route path="/trainers/:id" element={<TrainerDetail />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/clients/:id" element={<ClientDetail />} />
                <Route path="/assignments" element={<Assignments />} />
                <Route path="/libraries" element={<Libraries />} />
                <Route path="/diet-plans" element={<DietPlans />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/404" element={<NotFound />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
            </Route>
        </Routes>
    )
}
