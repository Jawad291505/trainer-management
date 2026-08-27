import { Skeleton } from 'antd'

// Reusable page-level loading skeleton mimicking cards + table.
export default function LoadingSkeleton({ rows = 4, cards = 4 }) {
    return (
        <div className="animate-rise">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: cards }).map((_, i) => (
                    <div key={i} className="app-card p-5">
                        <Skeleton active paragraph={{ rows: 1 }} title={{ width: '50%' }} />
                    </div>
                ))}
            </div>
            <div className="app-card mt-6 p-5">
                <Skeleton active paragraph={{ rows }} />
            </div>
        </div>
    )
}
