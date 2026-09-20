import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Button, Input, Rate } from 'antd'
import dayjs from 'dayjs'
import { StarOutlined } from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import EmptyState from '../../../components/common/EmptyState'
import UserAvatar from '../../../components/common/UserAvatar'
import AsyncSection from '../../../components/feedback/AsyncSection'
import { useAsyncData } from '../../../hooks/useAsyncData'
import { api } from '../../../services/api'

const MAX_COMMENT = 1000
const LABELS = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent']

export default function RateTrainer() {
    const { message } = App.useApp()
    const navigate = useNavigate()
    const { data, loading, error, reload } = useAsyncData(() => api.get('/reviews'), [])

    const trainer = data?.trainer
    const current = data?.current
    const past = (data?.items || []).filter((r) => r.id !== current?.id)

    const [rating, setRating] = useState(0)
    const [comment, setComment] = useState('')
    const [saving, setSaving] = useState(false)

    // Pre-fill the form with the review already given to the current trainer.
    useEffect(() => {
        setRating(current?.rating || 0)
        setComment(current?.comment || '')
    }, [current?.id, current?.rating, current?.comment])

    const dirty = rating !== (current?.rating || 0) || comment.trim() !== (current?.comment || '')

    const submit = async () => {
        setSaving(true)
        try {
            await api.post('/reviews', { rating, comment: comment.trim() })
            message.success(current ? 'Review updated' : 'Thanks for your review!')
            reload()
        } catch (err) {
            message.error(err.message || "Couldn't save your review")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div>
            <PageHeader title="Rate Trainer" subtitle="Tell us how your coaching is going. Your trainer and the team can read your review." />

            <AsyncSection loading={loading} error={error} onRetry={reload} errorTitle="Couldn't load your review" rows={5}>
                {!trainer ? (
                    <div className="app-card">
                        <EmptyState
                            icon={<StarOutlined />}
                            title="No trainer assigned yet"
                            description="Once a trainer is assigned to you, you can leave a review here."
                        />
                    </div>
                ) : (
                    <div className="app-card p-5">
                        <div className="flex items-center gap-3">
                            <UserAvatar name={trainer.name || ''} color={trainer.avatarColor} size={44} />
                            <div>
                                <div className="text-base font-bold text-text-primary">{trainer.name}</div>
                                <div className="text-xs text-text-muted">
                                    {current ? `You reviewed this trainer on ${dayjs(current.updatedAt).format('D MMM YYYY')}` : 'Your trainer'}
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center gap-3">
                            <Rate value={rating} onChange={setRating} style={{ fontSize: 28 }} />
                            {rating > 0 && <span className="text-sm font-semibold text-text-secondary">{LABELS[rating - 1]}</span>}
                        </div>

                        <Input.TextArea
                            className="mt-4"
                            rows={4}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            maxLength={MAX_COMMENT}
                            showCount
                            placeholder="What's working well? What could be better? (optional)"
                        />

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <Button type="primary" loading={saving} disabled={!rating || !dirty} onClick={submit}>
                                {current ? 'Update review' : 'Submit review'}
                            </Button>
                            <Button onClick={() => navigate('/messages')}>Message Trainer</Button>
                        </div>
                    </div>
                )}

                {past.length > 0 && (
                    <div className="mt-6">
                        <h3 className="section-title mb-3">Earlier reviews</h3>
                        <div className="flex flex-col gap-3">
                            {past.map((r) => (
                                <div key={r.id} className="app-card p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-semibold text-text-primary">{r.trainerName}</div>
                                            <div className="text-xs text-text-muted">{dayjs(r.updatedAt).format('D MMM YYYY')}</div>
                                        </div>
                                        <Rate disabled value={r.rating} style={{ fontSize: 14 }} />
                                    </div>
                                    {r.comment && <p className="mt-3 mb-0 whitespace-pre-wrap text-sm text-text-secondary">{r.comment}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </AsyncSection>
        </div>
    )
}
