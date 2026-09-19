import { Skeleton } from 'antd'
import SectionError from './SectionError'

// Loading / error / content switch for one API-driven section. Wrap only the part
// of a page that depends on a request, so a slow or failed call never blanks
// the parts that don't.
export default function AsyncSection({ loading, error, onRetry, errorTitle, rows = 4, children }) {
    if (loading) return <Skeleton active paragraph={{ rows }} />
    if (error) return <SectionError title={errorTitle} error={error} onRetry={onRetry} />
    return children
}
