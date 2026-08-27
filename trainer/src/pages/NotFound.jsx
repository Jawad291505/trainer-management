import { Button } from 'antd'
import { useNavigate } from 'react-router-dom'

export default function NotFound() {
    const navigate = useNavigate()
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
            <div className="text-7xl font-black" style={{ color: 'var(--color-primary)' }}>
                404
            </div>
            <h2 className="mt-2 text-xl font-bold text-text-primary">Page not found</h2>
            <p className="mt-1 max-w-sm text-text-secondary">
                The page you are looking for doesn't exist or has been moved.
            </p>
            <Button type="primary" className="mt-4" onClick={() => navigate('/')}>
                Back to dashboard
            </Button>
        </div>
    )
}
