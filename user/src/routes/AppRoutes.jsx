import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout'
import Dashboard from '../portals/client/pages/Dashboard'
import MyDiet from '../portals/client/pages/MyDiet'
import MyExercises from '../portals/client/pages/MyExercises'
import MySchedule from '../portals/client/pages/MySchedule'
import MyProgress from '../portals/client/pages/MyProgress'
import Messages from '../portals/client/pages/Messages'
import NotificationsPage from '../portals/client/pages/NotificationsPage'
import Profile from '../portals/client/pages/Profile'
import Settings from '../portals/client/pages/Settings'
import NotFound from '../pages/NotFound'

export default function AppRoutes() {
    return (
        <Routes>
            <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/diet" element={<MyDiet />} />
                <Route path="/exercises" element={<MyExercises />} />
                <Route path="/schedule" element={<MySchedule />} />
                <Route path="/progress" element={<MyProgress />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/404" element={<NotFound />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
            </Route>
        </Routes>
    )
}
