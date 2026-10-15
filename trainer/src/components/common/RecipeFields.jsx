import { Form, Input } from 'antd'
import ImageUploadField from './ImageUploadField'
import YouTubePreview from './YouTubePreview'
import { youtubeRule } from '../../utils/youtube'

// The optional recipe section of a meal form — preparation steps, a YouTube
// walkthrough and a photo. Field names match the API: recipe / youtubeUrl / image.
// `youtubeUrl` is the watched field value, for the live video preview.
export default function RecipeFields({ youtubeUrl }) {
    return (
        <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
            <div className="mb-3 text-xs font-bold uppercase tracking-wide text-text-muted">Recipe (optional)</div>
            <Form.Item name="recipe" label="Recipe instructions" rules={[{ max: 5000, message: 'Keep it under 5000 characters' }]}>
                <Input.TextArea autoSize={{ minRows: 3, maxRows: 10 }} placeholder={'Ingredients and preparation steps, e.g.\n1. Whisk the eggs…\n2. Cook on medium heat…'} />
            </Form.Item>
            <Form.Item name="youtubeUrl" label="YouTube link" rules={[youtubeRule]} className={youtubeUrl ? 'mb-2' : undefined}>
                <Input placeholder="https://youtube.com/watch?v=…" inputMode="url" allowClear />
            </Form.Item>
            {youtubeUrl && <YouTubePreview url={youtubeUrl} title="Recipe video" className="mb-4" />}
            <Form.Item name="image" label="Meal image" className="mb-0">
                <ImageUploadField kind="meal" />
            </Form.Item>
        </div>
    )
}
