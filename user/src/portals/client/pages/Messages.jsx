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
        <div className="chat-shell flex flex-col" style={{ height: 'calc(100vh - 210px)', minHeight: 440 }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4">
                <Badge dot={trainer.online} color="var(--color-success)" offset={[-3, 37]}>
                    <UserAvatar name={trainer.name} color={trainer.avatarColor} size={44} />
                </Badge>
                <div>
                    <div className="text-sm font-bold text-text-primary">{trainer.name}</div>
                    <div
                        className="text-xs"
                        style={{ color: trainer.online ? 'var(--color-success)' : 'var(--color-text-muted)' }}
                    >
                        {trainer.online ? 'Online' : 'Offline'} · Your trainer
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="chat-canvas flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                <div className="mx-auto flex max-w-2xl flex-col">
                    {thread.map((m, i) => {
                        const mine = m.from === 'client'
                        const grouped = thread[i - 1]?.from === m.from
                        return (
                            <div
                                key={m.id}
                                className={`flex ${mine ? 'justify-end' : 'justify-start'} ${
                                    grouped ? 'mt-1' : 'mt-3'
                                } first:mt-0`}
                            >
                                <div
                                    className={`max-w-[78%] px-3.5 py-2 text-sm ${
                                        mine ? 'chat-bubble-out' : 'chat-bubble-in'
                                    }`}
                                    style={{
                                        borderRadius: 18,
                                        ...(mine
                                            ? { borderBottomRightRadius: grouped ? 18 : 6 }
                                            : { borderBottomLeftRadius: grouped ? 18 : 6 }),
                                    }}
                                >
                                    <div className="whitespace-pre-wrap break-words">{m.text}</div>
                                    <div className="mt-0.5 text-right text-[10px]" style={{ opacity: 0.65 }}>
                                        {m.time}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    <div ref={endRef} />
                </div>
            </div>

            {/* Composer */}
            <div className="chat-composer p-3 sm:p-4">
                <div className="chat-field mx-auto flex max-w-2xl items-center gap-2 py-1.5 pl-4 pr-1.5">
                    <Input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onPressEnter={send}
                        placeholder="Message your trainer…"
                        variant="borderless"
                        style={{ padding: 0, background: 'transparent' }}
                    />
                    <Button type="primary" shape="circle" size="large" icon={<SendOutlined />} onClick={send} />
                </div>
            </div>
        </div>
    )
}
