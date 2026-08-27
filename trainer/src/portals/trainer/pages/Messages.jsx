import { useState, useRef, useEffect } from 'react'
import { Input, Button, Badge } from 'antd'
import { SendOutlined, ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons'
import UserAvatar from '../../../components/common/UserAvatar'
import EmptyState from '../../../components/common/EmptyState'
import { conversations, messagesByClient } from '../../../services/mockData'

export default function Messages() {
    const [activeId, setActiveId] = useState(null)
    const [search, setSearch] = useState('')
    const [drafts, setDrafts] = useState({})
    const [threads, setThreads] = useState(messagesByClient)
    const endRef = useRef(null)

    const active = conversations.find((c) => c.clientId === activeId)
    const messages = activeId ? threads[activeId] || [] : []

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages.length, activeId])

    const filtered = conversations.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))

    const send = () => {
        const text = (drafts[activeId] || '').trim()
        if (!text) return
        const msg = { id: `m${Date.now()}`, from: 'trainer', text, time: 'now' }
        setThreads((prev) => ({ ...prev, [activeId]: [...(prev[activeId] || []), msg] }))
        setDrafts((prev) => ({ ...prev, [activeId]: '' }))
    }

    return (
        <div>
            <div className="app-card overflow-hidden" style={{ height: 'calc(100vh - 190px)', minHeight: 480 }}>
                <div className="flex h-full">
                    {/* Conversation list */}
                    <div
                        className={`flex w-full flex-col border-r sm:w-80 ${activeId ? 'hidden sm:flex' : 'flex'}`}
                        style={{ borderColor: 'var(--color-border)' }}
                    >
                        <div className="border-b p-4" style={{ borderColor: 'var(--color-border)' }}>
                            <div className="mb-3 text-base font-bold text-text-primary">Messages</div>
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                prefix={<SearchOutlined style={{ color: 'var(--color-text-muted)' }} />}
                                placeholder="Search conversations…"
                                variant="filled"
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {filtered.map((c) => {
                                const isActive = c.clientId === activeId
                                return (
                                    <button
                                        key={c.id}
                                        onClick={() => setActiveId(c.clientId)}
                                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                                        style={{ background: isActive ? 'var(--color-primary-soft)' : 'transparent' }}
                                    >
                                        <Badge dot={c.online} color="var(--color-success)" offset={[-4, 36]}>
                                            <UserAvatar name={c.name} color={c.avatarColor} size={44} />
                                        </Badge>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className="truncate text-sm font-semibold text-text-primary">{c.name}</span>
                                                <span className="text-[11px] text-text-muted">{c.lastTime}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="truncate text-xs text-text-muted">{c.lastMessage}</span>
                                                {c.unread > 0 && (
                                                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white" style={{ background: 'var(--color-primary)' }}>
                                                        {c.unread}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Message thread */}
                    <div className={`flex flex-1 flex-col ${activeId ? 'flex' : 'hidden sm:flex'}`}>
                        {!active ? (
                            <div className="flex flex-1 items-center justify-center">
                                <EmptyState title="Select a conversation" description="Choose a client to start chatting." icon={<SendOutlined />} />
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-3 border-b p-4" style={{ borderColor: 'var(--color-border)' }}>
                                    <Button className="sm:hidden" type="text" icon={<ArrowLeftOutlined />} onClick={() => setActiveId(null)} />
                                    <Badge dot={active.online} color="var(--color-success)" offset={[-4, 36]}>
                                        <UserAvatar name={active.name} color={active.avatarColor} size={42} />
                                    </Badge>
                                    <div>
                                        <div className="text-sm font-bold text-text-primary">{active.name}</div>
                                        <div className="text-xs" style={{ color: active.online ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                                            {active.online ? 'Online' : 'Offline'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4" style={{ background: 'var(--color-surface-secondary)' }}>
                                    {messages.length === 0 ? (
                                        <div className="flex h-full items-center justify-center">
                                            <EmptyState title="No messages yet" description="Say hello to get started." />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            {messages.map((m) => {
                                                const mine = m.from === 'trainer'
                                                return (
                                                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                                        <div
                                                            className="max-w-[75%] rounded-2xl px-3.5 py-2 text-sm"
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
                                    )}
                                </div>

                                <div className="flex items-center gap-2 border-t p-3" style={{ borderColor: 'var(--color-border)' }}>
                                    <Input
                                        value={drafts[activeId] || ''}
                                        onChange={(e) => setDrafts((prev) => ({ ...prev, [activeId]: e.target.value }))}
                                        onPressEnter={send}
                                        placeholder="Type a message…"
                                        variant="filled"
                                    />
                                    <Button type="primary" icon={<SendOutlined />} onClick={send}>
                                        Send
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
