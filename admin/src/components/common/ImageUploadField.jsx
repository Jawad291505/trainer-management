import { useState } from 'react'
import { Upload, Button, App } from 'antd'
import { CameraOutlined, DeleteOutlined, LoadingOutlined, SwapOutlined } from '@ant-design/icons'
import { api } from '../../services/api'

const MAX_BYTES = 5 * 1024 * 1024 // matches the backend's multer limit (middlewares/upload.js)

// Optional photo for a food or meal. The file goes straight to Cloudinary via
// POST /library-images and only the returned URL is kept, so it works as a
// controlled antd Form field: `value` is the URL ('' / undefined = no image).
//   kind — 'food' | 'meal' (the Cloudinary folder it's stored in)
export default function ImageUploadField({ value, onChange, kind, disabled = false }) {
    const { message } = App.useApp()
    const [uploading, setUploading] = useState(false)

    const upload = async (file) => {
        if (!file.type?.startsWith('image/')) {
            message.error('Choose an image file (PNG, JPG or WebP)')
            return Upload.LIST_IGNORE
        }
        if (file.size > MAX_BYTES) {
            message.error('Images must be 5MB or smaller')
            return Upload.LIST_IGNORE
        }
        setUploading(true)
        try {
            const form = new FormData()
            form.append('kind', kind)
            form.append('image', file)
            const { url } = await api.upload('/library-images', form)
            onChange?.(url)
        } catch (err) {
            message.error(err.message || 'Could not upload the image')
        } finally {
            setUploading(false)
        }
        return Upload.LIST_IGNORE // handled above — keep antd's own upload list out of it
    }

    const picker = (children) => (
        <Upload accept="image/*" showUploadList={false} beforeUpload={upload} disabled={disabled || uploading}>
            {children}
        </Upload>
    )

    if (!value) {
        return picker(
            <Button icon={uploading ? <LoadingOutlined /> : <CameraOutlined />} disabled={disabled || uploading}>
                {uploading ? 'Uploading…' : 'Upload image'}
            </Button>,
        )
    }

    return (
        <div className="flex items-center gap-3">
            <img
                src={value}
                alt=""
                className="h-20 w-20 shrink-0 rounded-lg border object-cover"
                style={{ borderColor: 'var(--color-border)', opacity: uploading ? 0.5 : 1 }}
            />
            <div className="flex flex-col items-start gap-1">
                {picker(
                    <Button size="small" icon={uploading ? <LoadingOutlined /> : <SwapOutlined />} disabled={disabled || uploading}>
                        {uploading ? 'Uploading…' : 'Replace'}
                    </Button>,
                )}
                <Button size="small" type="text" danger icon={<DeleteOutlined />} disabled={disabled || uploading} onClick={() => onChange?.('')}>
                    Remove
                </Button>
            </div>
        </div>
    )
}
