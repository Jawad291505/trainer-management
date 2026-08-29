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

    const filtered = conversations.filter((c) =>
        c.name.toLowerCase().includes(search.trim().toLowerCase()),
    )

    const send = () => {
        const text = (drafts[activeId] || '').trim()
        if (!text) return
        const msg = { id: `m${Date.now()}`, from: 'trainer', text, time: 'now' }
        setThreads((prev) => ({ ...prev, [activeId]: [...(prev[activeId] || []), msg] }))
        setDrafts((prev) => ({ ...prev, [activeId]: '' }))
    }

    return (
        <div className="chat-shell flex" style={{ height: 'calc(100vh - 190px)', minHeight: 480 }}>
            {/* Conversation list */}
            <div
                className={`chat-hairline w-full shrink-0 flex-col sm:flex sm:w-80 lg:w-96 ${
                    activeId ? 'hidden sm:flex' : 'flex'
                }`}
            >
                <div className="px-5 pb-3 pt-5">
                    <div className="mb-3 text-lg font-extrabold tracking-tight text-text-primary">Messages</div>
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        prefix={<SearchOutlined style={{ color: 'var(--color-text-muted)' }} />}
                        placeholder="Search conversations…"
                        variant="filled"
                        style={{ borderRadius: 999 }}
                    />
                </div>
                <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
                    {filtered.map((c) => {
                        const isActive = c.clientId === activeId
                        return (
                            <button
                                key={c.id}
                                onClick={() => setActiveId(c.clientId)}
                                className={`chat-conv flex w-full items-center gap-3 px-3 py-3 text-left ${
                                    isActive ? 'chat-conv-active' : ''
                                }`}
                            >
                                <Badge dot={c.online} color="var(--color-success)" offset={[-3, 39]}>
                                    <UserAvatar name={c.name} color={c.avatarColor} size={46} />
                                </Badge>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="truncate text-sm font-semibold text-text-primary">{c.name}</span>
                                        <span className="shrink-0 text-[11px] text-text-muted">{c.lastTime}</span>
                                    </div>
                                    <div className="mt-0.5 flex items-center justify-between gap-2">
                                        <span
                                            className={`truncate text-xs ${
                                                c.unread ? 'font-semibold text-text-secondary' : 'text-text-muted'
                                            }`}
                                        >
                                            {c.lastMessage}
                                        </span>
                                        {c.unread > 0 && (
                                            <span
                                                className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white"
                                                style={{ background: 'var(--color-primary)' }}
                                            >
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
            <div className={`min-w-0 flex-1 flex-col ${activeId ? 'flex' : 'hidden sm:flex'}`}>
                {!active ? (
                    <div className="flex flex-1 items-center justify-center">
                        <EmptyState
                            title="Select a conversation"
                            description="Choose a client to start chatting."
                            icon={<SendOutlined />}
                        />
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-3 px-5 py-4">
                            <Button
                                className="sm:hidden"
                                type="text"
                                icon={<ArrowLeftOutlined />}
                                onClick={() => setActiveId(null)}
                            />
                            <Badge dot={active.online} color="var(--color-success)" offset={[-3, 37]}>
                                <UserAvatar name={active.name} color={active.avatarColor} size={44} />
                            </Badge>
                            <div>
                                <div className="text-sm font-bold text-text-primary">{active.name}</div>
                                <div
                                    className="text-xs"
                                    style={{ color: active.online ? 'var(--color-success)' : 'var(--color-text-muted)' }}
                                >
                                    {active.online ? 'Online' : 'Offline'}
                                </div>
                            </div>
                        </div>

                        <div className="chat-canvas flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                            {messages.length === 0 ? (
                                <div className="flex h-full items-center justify-center">
                                    <EmptyState title="No messages yet" description="Say hello to get started." />
                                </div>
                            ) : (
                                <div className="mx-auto flex max-w-3xl flex-col">
                                    {messages.map((m, i) => {
                                        const mine = m.from === 'trainer'
                                        const grouped = messages[i - 1]?.from === m.from
                                        return (
                                            <div
                                                key={m.id}
                                                className={`flex ${mine ? 'justify-end' : 'justify-start'} ${
                                                    grouped ? 'mt-1' : 'mt-3'
                                                } first:mt-0`}
                                            >
                                                <div
                                                    className={`max-w-[76%] px-3.5 py-2 text-sm ${
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
                            )}
                        </div>

                        <div className="chat-composer p-3 sm:p-4">
                            <div className="chat-field mx-auto flex max-w-3xl items-center gap-2 py-1.5 pl-4 pr-1.5">
                                <Input
                                    value={drafts[activeId] || ''}
                                    onChange={(e) =>
                                        setDrafts((prev) => ({ ...prev, [activeId]: e.target.value }))
                                    }
                                    onPressEnter={send}
                                    placeholder="Type a message…"
                                    variant="borderless"
                                    style={{ padding: 0, background: 'transparent' }}
                                />
                                <Button
                                    type="primary"
                                    shape="circle"
                                    size="large"
                                    icon={<SendOutlined />}
                                    onClick={send}
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
