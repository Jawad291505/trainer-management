import { Table } from 'antd'

// Premium-styled wrapper around AntD Table with sensible defaults and
// a rounded container. On small screens the table scrolls horizontally.
export default function DataTable({
    columns,
    dataSource,
    rowKey = 'id',
    loading,
    pageSize = 8,
    scrollX = 900,
    ...rest
}) {
    return (
        <div className="app-card overflow-hidden">
            <Table
                columns={columns}
                dataSource={dataSource}
                rowKey={rowKey}
                loading={loading}
                scroll={{ x: scrollX }}
                pagination={{
                    pageSize,
                    showSizeChanger: false,
                    showTotal: (total, range) => `${range[0]}–${range[1]} of ${total}`,
                    responsive: true,
                }}
                {...rest}
            />
        </div>
    )
}
