import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import AppLayout from '../layouts/AppLayout'
import PageSpin from '../components/common/PageSpin'
import Login from '../pages/Login'
import { useAuth } from '../context/AuthContext'

// Each page is its own chunk — a portal only downloads the pages it actually visits.
const SetPassword = lazy(() => import('../pages/SetPassword'))
const Dashboard = lazy(() => import('../portals/trainer/pages/Dashboard'))
const Clients = lazy(() => import('../portals/trainer/pages/Clients'))
const ClientProfile = lazy(() => import('../portals/trainer/pages/ClientProfile'))
const Schedule = lazy(() => import('../portals/trainer/pages/Schedule'))
const DietPlans = lazy(() => import('../portals/trainer/pages/DietPlans'))
const ExercisePlans = lazy(() => import('../portals/trainer/pages/ExercisePlans'))
const FollowUps = lazy(() => import('../portals/trainer/pages/FollowUps'))
const Requests = lazy(() => import('../portals/trainer/pages/Requests'))
const Messages = lazy(() => import('../portals/trainer/pages/Messages'))
const NotificationsPage = lazy(() => import('../portals/trainer/pages/NotificationsPage'))
const Settings = lazy(() => import('../portals/trainer/pages/Settings'))
const NotFound = lazy(() => import('../pages/NotFound'))

export default function AppRoutes() {
    const { authed, loading, user } = useAuth()
    const mustChangePassword = !!user?.mustChangePassword

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Spin size="large" />
            </div>
        )
    }

    return (
        <Suspense fallback={<PageSpin />}>
            <Routes>
                <Route path="/login" element={authed ? <Navigate to="/" replace /> : <Login />} />
                <Route
                    path="/set-password"
                    element={authed ? (mustChangePassword ? <SetPassword /> : <Navigate to="/" replace />) : <Navigate to="/login" replace />}
                />
                <Route element={authed ? (mustChangePassword ? <Navigate to="/set-password" replace /> : <AppLayout />) : <Navigate to="/login" replace />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/clients" element={<Clients />} />
                    <Route path="/clients/:id" element={<ClientProfile />} />
                    <Route path="/schedule" element={<Schedule />} />
                    <Route path="/diet-plans" element={<DietPlans />} />
                    <Route path="/exercise-plans" element={<ExercisePlans />} />
                    <Route path="/follow-ups" element={<FollowUps />} />
                    <Route path="/requests" element={<Requests />} />
                    <Route path="/messages" element={<Messages />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/404" element={<NotFound />} />
                    <Route path="*" element={<Navigate to="/404" replace />} />
                </Route>
            </Routes>
        </Suspense>
    )
}
