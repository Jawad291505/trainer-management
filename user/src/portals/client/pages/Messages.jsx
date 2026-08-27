import { useState, useRef, useEffect } from 'react'
import { Input, Button, Badge } from 'antd'
import { SendOutlined } from '@ant-design/icons'
import UserAvatar from '../../../components/common/UserAvatar'
import { trainer, messages as seed } from '../../../services/mockData'

export default function Messages() {
    const [thread, setThread] = useState(seed)
    const [draft, setDraft] = useState('')
    const endRef = useRef(null)

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [thread.length])

    const send = () => {
        const text = draft.trim()
        if (!text) return
        setThread((prev) => [...prev, { id: `m${Date.now()}`, from: 'client', text, time: 'now' }])
        setDraft('')
    }

    return (
        <div>
            <div className="app-card flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 210px)', minHeight: 440 }}>
                {/* Header */}
                <div className="flex items-center gap-3 border-b p-4" style={{ borderColor: 'var(--color-border)' }}>
                    <Badge dot={trainer.online} color="var(--color-success)" offset={[-4, 36]}>
                        <UserAvatar name={trainer.name} color={trainer.avatarColor} size={44} />
                    </Badge>
                    <div>
                        <div className="text-sm font-bold text-text-primary">{trainer.name}</div>
                        <div className="text-xs" style={{ color: trainer.online ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                            {trainer.online ? 'Online' : 'Offline'} · Your trainer
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4" style={{ background: 'var(--color-surface-secondary)' }}>
                    <div className="flex flex-col gap-3">
                        {thread.map((m) => {
                            const mine = m.from === 'client'
                            return (
                                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className="max-w-[78%] rounded-2xl px-3.5 py-2 text-sm"
                                        style={
                                            mine
                                                ? { background: 'var(--color-primary)', color: 'var(--color-on-primary, #fff)', borderBottomRightRadius: 4 }
                                                : { background: 'var(--color-surface)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', borderBottomLeftRadius: 4 }
                                        }
                                    >
                                        <div>{m.text}</div>
                                        <div className="mt-0.5 text-right text-[10px]" style={{ opacity: 0.7 }}>{m.time}</div>
                                    </div>
                                </div>
                            )
                        })}
                        <div ref={endRef} />
                    </div>
                </div>

                {/* Composer */}
                <div className="flex items-center gap-2 border-t p-3" style={{ borderColor: 'var(--color-border)' }}>
                    <Input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onPressEnter={send}
                        placeholder="Message your trainer…"
                        variant="filled"
                    />
                    <Button type="primary" icon={<SendOutlined />} onClick={send}>
                        Send
                    </Button>
                </div>
            </div>
        </div>
    )
}
