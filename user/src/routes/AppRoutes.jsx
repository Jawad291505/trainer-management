import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import AppLayout from '../layouts/AppLayout'
import PageSpin from '../components/common/PageSpin'
import Login from '../pages/Login'
import { useAuth } from '../context/AuthContext'

// Each page is its own chunk — a portal only downloads the pages it actually visits.
const ForgotPassword = lazy(() => import('../pages/ForgotPassword'))
const SetPassword = lazy(() => import('../pages/SetPassword'))
const Dashboard = lazy(() => import('../portals/client/pages/Dashboard'))
const MyDiet = lazy(() => import('../portals/client/pages/MyDiet'))
const GroceryList = lazy(() => import('../portals/client/pages/GroceryList'))
const MyExercises = lazy(() => import('../portals/client/pages/MyExercises'))
const WorkoutRunner = lazy(() => import('../portals/client/pages/WorkoutRunner'))
const MySchedule = lazy(() => import('../portals/client/pages/MySchedule'))
const FollowUps = lazy(() => import('../portals/client/pages/FollowUps'))
const MyProgress = lazy(() => import('../portals/client/pages/MyProgress'))
const Messages = lazy(() => import('../portals/client/pages/Messages'))
const MyRequests = lazy(() => import('../portals/client/pages/MyRequests'))
const RateTrainer = lazy(() => import('../portals/client/pages/RateTrainer'))
const NotificationsPage = lazy(() => import('../portals/client/pages/NotificationsPage'))
const Profile = lazy(() => import('../portals/client/pages/Profile'))
const Settings = lazy(() => import('../portals/client/pages/Settings'))
const NotFound = lazy(() => import('../pages/NotFound'))

export default function AppRoutes() {
    const { authed, loading, user } = useAuth()
    const mustChangePassword = !!user?.mustChangePassword

    if (loading) {
        return <div className="flex min-h-screen items-center justify-center"><Spin size="large" /></div>
    }

    return (
        <Suspense fallback={<PageSpin />}>
            <Routes>
                <Route path="/login" element={authed ? <Navigate to="/" replace /> : <Login />} />
                <Route path="/forgot-password" element={authed ? <Navigate to="/" replace /> : <ForgotPassword />} />
                <Route
                    path="/set-password"
                    element={authed ? (mustChangePassword ? <SetPassword /> : <Navigate to="/" replace />) : <Navigate to="/login" replace />}
                />
                <Route element={authed ? (mustChangePassword ? <Navigate to="/set-password" replace /> : <AppLayout />) : <Navigate to="/login" replace />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/diet" element={<MyDiet />} />
                    <Route path="/grocery-list" element={<GroceryList />} />
                    <Route path="/exercises" element={<MyExercises />} />
                    <Route path="/workout" element={<WorkoutRunner />} />
                    <Route path="/schedule" element={<MySchedule />} />
                    <Route path="/follow-ups" element={<FollowUps />} />
                    <Route path="/progress" element={<MyProgress />} />
                    <Route path="/messages" element={<Messages />} />
                    <Route path="/requests" element={<MyRequests />} />
                    <Route path="/rate-trainer" element={<RateTrainer />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/404" element={<NotFound />} />
                    <Route path="*" element={<Navigate to="/404" replace />} />
                </Route>
            </Routes>
        </Suspense>
    )
}
