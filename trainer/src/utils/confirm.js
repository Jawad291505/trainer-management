import { Modal } from 'antd'
import { ExclamationCircleFilled } from '@ant-design/icons'
import { createElement } from 'react'

// Reusable destructive-action confirmation dialog.
export function confirmDelete({ title, content, onOk, okText = 'Delete' }) {
    Modal.confirm({
        title,
        icon: createElement(ExclamationCircleFilled, { style: { color: 'var(--color-danger)' } }),
        content,
        okText,
        okButtonProps: { danger: true },
        cancelText: 'Cancel',
        centered: true,
        onOk,
    })
}
