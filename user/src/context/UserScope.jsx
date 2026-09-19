import { Fragment } from 'react'
import { useAuth } from './AuthContext'

// Wraps the data providers (schedule, library, corrections, …) that hold
// per-user data. Two jobs:
//  - waits for the session check, so providers mount once with a known user
//    (no fetch fires for a user who turns out to be logged out);
//  - keys them by user id, so login / logout / switching accounts remounts them
//    and one user's cached data can never leak into the next session.
export default function UserScope({ children }) {
    const { user, loading } = useAuth()
    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div
                    className="h-9 w-9 animate-spin rounded-full border-[3px]"
                    style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
                    role="status"
                    aria-label="Loading"
                />
            </div>
        )
    }
    return <Fragment key={user?.id || user?._id || 'anon'}>{children}</Fragment>
}
