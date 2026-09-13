import { Routes, Route, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import AppLayout from '../layouts/AppLayout'
import Login from '../pages/Login'
import Signup from '../pages/Signup'
import SetPassword from '../pages/SetPassword'
import VerifyEmail from '../pages/VerifyEmail'
import SelectPlan from '../pages/SelectPlan'
import SubmitPayment from '../pages/SubmitPayment'
import PendingApproval from '../pages/PendingApproval'
import { useAuth } from '../context/AuthContext'
import Dashboard from '../portals/admin/pages/Dashboard'
import Users from '../portals/admin/pages/Users'
import Members from '../portals/admin/pages/Members'
import MemberDetail from '../portals/admin/pages/MemberDetail'
import Trainers from '../portals/admin/pages/Trainers'
import TrainerDetail from '../portals/admin/pages/TrainerDetail'
import Clients from '../portals/admin/pages/Clients'
import ClientDetail from '../portals/admin/pages/ClientDetail'
import Assignments from '../portals/admin/pages/Assignments'
import Referrals from '../portals/admin/pages/Referrals'
import Libraries from '../portals/admin/pages/Libraries'
import Foods from '../portals/admin/pages/Foods'
import Exercises from '../portals/admin/pages/Exercises'
import DietPlans from '../portals/admin/pages/DietPlans'
import SubscriptionPlans from '../portals/admin/pages/SubscriptionPlans'
import PaymentApprovals from '../portals/admin/pages/PaymentApprovals'
import Payments from '../portals/admin/pages/Payments'
import NotificationsPage from '../portals/admin/pages/NotificationsPage'
import Settings from '../portals/admin/pages/Settings'
import NotFound from '../pages/NotFound'

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
    )
}
