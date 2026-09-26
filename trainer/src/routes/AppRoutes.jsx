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
const Signup = lazy(() => import('../pages/Signup'))
const VerifyEmail = lazy(() => import('../pages/VerifyEmail'))
const SelectPlan = lazy(() => import('../pages/SelectPlan'))
const SubmitPayment = lazy(() => import('../pages/SubmitPayment'))
const PendingApproval = lazy(() => import('../pages/PendingApproval'))
const PlanExpired = lazy(() => import('../pages/PlanExpired'))
const Dashboard = lazy(() => import('../portals/trainer/pages/Dashboard'))
const Clients = lazy(() => import('../portals/trainer/pages/Clients'))
const ClientProfile = lazy(() => import('../portals/trainer/pages/ClientProfile'))
const Schedule = lazy(() => import('../portals/trainer/pages/Schedule'))
const DietPlans = lazy(() => import('../portals/trainer/pages/DietPlans'))
const ExercisePlans = lazy(() => import('../portals/trainer/pages/ExercisePlans'))
const FollowUps = lazy(() => import('../portals/trainer/pages/FollowUps'))
const Requests = lazy(() => import('../portals/trainer/pages/Requests'))
const Reviews = lazy(() => import('../portals/trainer/pages/Reviews'))
const Messages = lazy(() => import('../portals/trainer/pages/Messages'))
const NotificationsPage = lazy(() => import('../portals/trainer/pages/NotificationsPage'))
const Settings = lazy(() => import('../portals/trainer/pages/Settings'))
const NotFound = lazy(() => import('../pages/NotFound'))

// Where a self-signup trainer mid-onboarding belongs, keyed by Trainer.onboardingStage.
const ONBOARDING_ROUTE = {
    verify_email: '/verify-email',
    select_plan: '/select-plan',
    submit_payment: '/submit-payment',
    awaiting_approval: '/pending-approval',
    rejected: '/pending-approval',
}

export default function AppRoutes() {
    const { authed, loading, user, trainer } = useAuth()
    const mustChangePassword = !!user?.mustChangePassword
    // Admin/member-created trainers are never 'pending' — this only gates a
    // self-signup (outsourced) trainer awaiting payment approval.
    const stage = trainer?.onboardingStage
    const isOnboarding = trainer?.status === 'pending' && !!stage
    // A lapsed paid period locks a subscribed trainer out (backend: PLAN_EXPIRED) until an admin renews.
    const isExpired = trainer?.status === 'active' && !!trainer?.planExpiryDate && new Date(trainer.planExpiryDate) < new Date()
    const onboardingPath = ONBOARDING_ROUTE[stage] || '/verify-email'
    const gate = (allowed, page) => (authed ? (isOnboarding && allowed.includes(stage) ? page : <Navigate to="/" replace />) : <Navigate to="/login" replace />)

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
                <Route path="/forgot-password" element={authed ? <Navigate to="/" replace /> : <ForgotPassword />} />
                <Route path="/signup" element={authed ? <Navigate to="/" replace /> : <Signup />} />
                <Route path="/verify-email" element={gate(['verify_email'], <VerifyEmail />)} />
                <Route path="/select-plan" element={gate(['select_plan'], <SelectPlan />)} />
                <Route path="/submit-payment" element={gate(['submit_payment', 'rejected'], <SubmitPayment />)} />
                <Route path="/pending-approval" element={gate(['awaiting_approval', 'rejected'], <PendingApproval />)} />
                <Route
                    path="/set-password"
                    element={authed ? (mustChangePassword ? <SetPassword /> : <Navigate to="/" replace />) : <Navigate to="/login" replace />}
                />
                <Route
                    element={
                        authed
                            ? mustChangePassword
                                ? <Navigate to="/set-password" replace />
                                : isOnboarding
                                    ? <Navigate to={onboardingPath} replace />
                                    : isExpired
                                        ? <PlanExpired />
                                        : <AppLayout />
                            : <Navigate to="/login" replace />
                    }
                >
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/clients" element={<Clients />} />
                    <Route path="/clients/:id" element={<ClientProfile />} />
                    <Route path="/schedule" element={<Schedule />} />
                    <Route path="/diet-plans" element={<DietPlans />} />
                    <Route path="/exercise-plans" element={<ExercisePlans />} />
                    <Route path="/follow-ups" element={<FollowUps />} />
                    <Route path="/requests" element={<Requests />} />
                    <Route path="/reviews" element={<Reviews />} />
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
