import { Button, Result } from 'antd'
import { CalendarOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useAuth } from '../context/AuthContext'

// A Member whose paid period has lapsed. The backend rejects everything except
// /auth/me (see middlewares/auth.js), so this is the only screen they can reach
// until an admin records a renewal.
export default function PlanExpired() {
    const { user, logout, refreshUser } = useAuth()
    const expiry = user?.member?.planExpiryDate

    return (
        <div className="mx-auto max-w-lg p-6 sm:p-10">
            <Result
                icon={<CalendarOutlined style={{ color: 'var(--color-warning, #d97706)' }} />}
                status="warning"
                title="Your subscription has expired"
                subTitle={`${expiry ? `Your plan ended on ${dayjs(expiry).format('D MMM YYYY')}. ` : ''}Contact your administrator to renew — your trainers, clients and data are kept safe and will be available again as soon as it's renewed.`}
                extra={[
                    <Button key="check" type="primary" onClick={() => refreshUser()}>Check again</Button>,
                    <Button key="out" onClick={logout}>Sign out</Button>,
                ]}
            />
        </div>
    )
}
