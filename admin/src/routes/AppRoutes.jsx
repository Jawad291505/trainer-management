import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import AppLayout from '../layouts/AppLayout'
import PageSpin from '../components/common/PageSpin'
import Login from '../pages/Login'
import { useAuth } from '../context/AuthContext'

// Each page is its own chunk — a portal only downloads the pages it actually visits.
const Signup = lazy(() => import('../pages/Signup'))
const SetPassword = lazy(() => import('../pages/SetPassword'))
const VerifyEmail = lazy(() => import('../pages/VerifyEmail'))
const SelectPlan = lazy(() => import('../pages/SelectPlan'))
const SubmitPayment = lazy(() => import('../pages/SubmitPayment'))
const PendingApproval = lazy(() => import('../pages/PendingApproval'))
const Dashboard = lazy(() => import('../portals/admin/pages/Dashboard'))
const Users = lazy(() => import('../portals/admin/pages/Users'))
const Members = lazy(() => import('../portals/admin/pages/Members'))
const MemberDetail = lazy(() => import('../portals/admin/pages/MemberDetail'))
const Trainers = lazy(() => import('../portals/admin/pages/Trainers'))
const TrainerDetail = lazy(() => import('../portals/admin/pages/TrainerDetail'))
const Clients = lazy(() => import('../portals/admin/pages/Clients'))
const ClientDetail = lazy(() => import('../portals/admin/pages/ClientDetail'))
const Assignments = lazy(() => import('../portals/admin/pages/Assignments'))
const Referrals = lazy(() => import('../portals/admin/pages/Referrals'))
const Reviews = lazy(() => import('../portals/admin/pages/Reviews'))
const Libraries = lazy(() => import('../portals/admin/pages/Libraries'))
const Foods = lazy(() => import('../portals/admin/pages/Foods'))
const Exercises = lazy(() => import('../portals/admin/pages/Exercises'))
const DietPlans = lazy(() => import('../portals/admin/pages/DietPlans'))
const SubscriptionPlans = lazy(() => import('../portals/admin/pages/SubscriptionPlans'))
const PaymentApprovals = lazy(() => import('../portals/admin/pages/PaymentApprovals'))
const Payments = lazy(() => import('../portals/admin/pages/Payments'))
const NotificationsPage = lazy(() => import('../portals/admin/pages/NotificationsPage'))
const Settings = lazy(() => import('../portals/admin/pages/Settings'))
const NotFound = lazy(() => import('../pages/NotFound'))

// Where a self-signup Member mid-onboarding belongs, keyed by Member.onboardingStage.
const ONBOARDING_ROUTE = {
    verify_email: '/verify-email',
    select_plan: '/select-plan',
    submit_payment: '/submit-payment',
    awaiting_approval: '/pending-approval',
    rejected: '/pending-approval',
}

export default function AppRoutes() {
    const { authed, loading, user } = useAuth()
    const isAdmin = user?.role === 'admin'
    const mustChangePassword = !!user?.mustChangePassword
    const member = user?.member
    // Admin-invited Members skip onboarding entirely (status is 'active' from
    // creation) — this only ever gates a self-signup Member awaiting approval.
    const isOnboarding = user?.role === 'member' && member?.status === 'pending'
    const stage = member?.onboardingStage
    const onboardingPath = ONBOARDING_ROUTE[stage] || '/verify-email'

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
                <Route path="/signup" element={authed ? <Navigate to="/" replace /> : <Signup />} />
                <Route
                    path="/set-password"
                    element={authed ? (mustChangePassword ? <SetPassword /> : <Navigate to="/" replace />) : <Navigate to="/login" replace />}
                />
                <Route
                    path="/verify-email"
                    element={authed ? (isOnboarding && stage === 'verify_email' ? <VerifyEmail /> : <Navigate to="/" replace />) : <Navigate to="/login" replace />}
                />
                <Route
                    path="/select-plan"
                    element={authed ? (isOnboarding && stage === 'select_plan' ? <SelectPlan /> : <Navigate to="/" replace />) : <Navigate to="/login" replace />}
                />
                <Route
                    path="/submit-payment"
                    element={authed ? (isOnboarding && ['submit_payment', 'rejected'].includes(stage) ? <SubmitPayment /> : <Navigate to="/" replace />) : <Navigate to="/login" replace />}
                />
                <Route
                    path="/pending-approval"
                    element={authed ? (isOnboarding && ['awaiting_approval', 'rejected'].includes(stage) ? <PendingApproval /> : <Navigate to="/" replace />) : <Navigate to="/login" replace />}
                />
                <Route
                    element={
                        authed
                            ? mustChangePassword
                                ? <Navigate to="/set-password" replace />
                                : isOnboarding
                                    ? <Navigate to={onboardingPath} replace />
                                    : <AppLayout />
                            : <Navigate to="/login" replace />
                    }
                >
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/members" element={isAdmin ? <Members /> : <Navigate to="/" replace />} />
                    <Route path="/members/:id" element={isAdmin ? <MemberDetail /> : <Navigate to="/" replace />} />
                    <Route path="/trainers" element={<Trainers />} />
                    <Route path="/trainers/:id" element={<TrainerDetail />} />
                    <Route path="/clients" element={<Clients />} />
                    <Route path="/clients/:id" element={<ClientDetail />} />
                    <Route path="/assignments" element={<Assignments />} />
                    <Route path="/referrals" element={<Referrals />} />
                    <Route path="/reviews" element={<Reviews />} />
                    <Route path="/libraries" element={<Libraries />} />
                    <Route path="/foods" element={<Foods />} />
                    <Route path="/exercises" element={<Exercises />} />
                    <Route path="/diet-plans" element={<DietPlans />} />
                    <Route path="/subscription-plans" element={isAdmin ? <SubscriptionPlans /> : <Navigate to="/" replace />} />
                    <Route path="/payment-approvals" element={isAdmin ? <PaymentApprovals /> : <Navigate to="/" replace />} />
                    <Route path="/payments" element={isAdmin ? <Payments /> : <Navigate to="/" replace />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/404" element={<NotFound />} />
                    <Route path="*" element={<Navigate to="/404" replace />} />
                </Route>
            </Routes>
        </Suspense>
    )
}
