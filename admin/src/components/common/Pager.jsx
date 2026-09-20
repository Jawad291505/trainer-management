import { Pagination } from 'antd'

// Page numbers shown below a server-paginated list (see hooks/usePagedList.js).
export default function Pager({ list, pageSizeOptions = [12, 24, 48] }) {
    const { total, page, pageSize, setPage, setPageSize } = list
    // Shown even when everything fits on one page, so the page-size selector stays reachable.
    if (!total) return null
    return (
        <div className="mt-6 flex justify-end">
            <Pagination
                current={page}
                pageSize={pageSize}
                total={total}
                showSizeChanger
                pageSizeOptions={pageSizeOptions}
                showTotal={(t, range) => `${range[0]}–${range[1]} of ${t}`}
                onChange={setPage}
                onShowSizeChange={(_, size) => setPageSize(size)}
                responsive
            />
        </div>
    )
}
