import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { App, Input, Button, Skeleton, Modal, Tooltip } from 'antd'
import { SendOutlined, ArrowLeftOutlined, SearchOutlined, EditOutlined } from '@ant-design/icons'
import UserAvatar from '../../../components/common/UserAvatar'
import EmptyState from '../../../components/common/EmptyState'
import ModalTitle from '../../../components/common/ModalTitle'
import PageSpin from '../../../components/common/PageSpin'
import SectionError from '../../../components/feedback/SectionError'
import { api } from '../../../services/api'
import { getSocket } from '../../../services/socket'
import { useClientList } from '../../../hooks/useClientList'

export default function Messages() {
    const { message: toast } = App.useApp()
    const [conversations, setConversations] = useState([])
    const [activeId, setActiveId] = useState(null)
    const [search, setSearch] = useState('')
    const [drafts, setDrafts] = useState({})
    const [messages, setMessages] = useState([])
    const [typing, setTyping] = useState(null)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(null)
    const [threadLoading, setThreadLoading] = useState(false)
    const [threadError, setThreadError] = useState(null)
    // A chat with a client that has no conversation yet: { clientId, name, avatarColor }.
    // Nothing is saved until the first message is sent.
    const [newChat, setNewChat] = useState(null)
    const [picking, setPicking] = useState(false)
    const [pickSearch, setPickSearch] = useState('')
    const [searchParams, setSearchParams] = useSearchParams()
    const { clients, loading: clientsLoading } = useClientList(picking)
    const endRef = useRef(null)
    const socketRef = useRef(null)

    // Load conversation list
    const loadConversations = useCallback(() => {
        setLoading(true)
        setLoadError(null)
        api.get('/conversations').then((res) => setConversations(res.items || [])).catch(setLoadError).finally(() => setLoading(false))
    }, [])
    useEffect(() => { loadConversations() }, [loadConversations])

    // Connect socket
    useEffect(() => {
        const s = getSocket()
        if (!s) return
        socketRef.current = s

        // Named so cleanup removes only this page's listener — the sidebar badge
        // listens to the same event on the shared socket.
        const onConversationUpdated = (row) => {
            setConversations((prev) => {
                const idx = prev.findIndex((c) => c.conversationId === row.conversationId || c.id === row.id)
                if (idx >= 0) { const n = [...prev]; n[idx] = { ...n[idx], ...row }; return n }
                return [row, ...prev]
            })
        }
        s.on('conversation:updated', onConversationUpdated)

        s.on('message:new', (payload) => {
            if (!payload?.message) return
            setMessages((prev) => {
                if (prev.some((m) => m.id === payload.message.id)) return prev
                return [...prev, payload.message]
            })
        })

        s.on('typing', (payload) => {
            setTyping(payload?.isTyping ? payload : null)
            if (payload?.isTyping) setTimeout(() => setTyping(null), 3000)
        })

        return () => {
            s.off('conversation:updated', onConversationUpdated)
            s.off('message:new')
            s.off('typing')
        }
    }, [])

    // Open a conversation
    // Never leaves the thread spinning: a failed ack or a silent socket becomes an error with a retry.
    const openConversation = useCallback((convoId) => {
        setNewChat(null)
        setActiveId(convoId)
        setMessages([])
        setThreadError(null)
        const s = socketRef.current
        if (!s) return
        setThreadLoading(true)
        const timer = setTimeout(() => {
            setThreadLoading(false)
            setThreadError('Couldn\'t reach chat. Check your connection and try again.')
        }, 12000)
        s.emit('conversation:open', { conversationId: convoId }, (res) => {
            clearTimeout(timer)
            if (res?.ok) {
                setMessages(res.messages || [])
                setThreadError(null)
            } else {
                setThreadError(res?.error || 'Couldn\'t load this conversation')
            }
            setThreadLoading(false)
        })
    }, [])

    // Resume the client's conversation, or open a blank draft thread for them.
    // The draft becomes a real conversation when the first message is sent.
    const startWithClient = useCallback((clientId, client) => {
        const existing = conversations.find((c) => c.clientId === clientId)
        if (existing) return openConversation(existing.conversationId || existing.id)
        setActiveId(null)
        setMessages([])
        setThreadError(null)
        setThreadLoading(false)
        setNewChat({ clientId, name: client?.name, avatarColor: client?.avatarColor })
        // Deep links only carry the id — fetch the client's name for the header.
        if (!client) {
            api.get(`/clients/${clientId}`)
                .then((c) => setNewChat((prev) => (prev?.clientId === clientId ? { ...prev, name: c.name, avatarColor: c.avatarColor } : prev)))
                .catch(() => {})
        }
    }, [conversations, openConversation])

    // Deep link from a client card / profile: /messages?client=<clientId>
    useEffect(() => {
        const preset = searchParams.get('client')
        if (!preset || loading || loadError) return
        setSearchParams({}, { replace: true })
        startWithClient(preset)
    }, [searchParams, loading, loadError, setSearchParams, startWithClient])

    const pickClient = (client) => {
        setPicking(false)
        setPickSearch('')
        startWithClient(client.id, client)
    }

    // Leave conversation on switch
    useEffect(() => {
        return () => {
            if (activeId && socketRef.current) {
                socketRef.current.emit('conversation:leave', { conversationId: activeId })
            }
        }
    }, [activeId])

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages.length, activeId])

    const active = newChat || conversations.find((c) => (c.conversationId || c.id) === activeId)
    // Drafts are keyed by conversation, or by client while the chat is still new.
    const threadKey = activeId || (newChat ? `new:${newChat.clientId}` : null)

    const send = () => {
        const text = (drafts[threadKey] || '').trim()
        if (!text || !threadKey) return
        const s = socketRef.current
        if (!s) return
        const chat = newChat
        // First message to a new chat goes by clientId — the backend creates the conversation.
        const target = activeId ? { conversationId: activeId } : { clientId: chat.clientId }
        s.emit('message:send', { ...target, text }, (res) => {
            if (!res?.ok || !res.message) {
                if (chat) {
                    toast.error(res?.error || 'Couldn\'t send your message')
                    setDrafts((prev) => ({ ...prev, [threadKey]: text }))
                }
                return
            }
            if (chat) {
                const id = res.message.conversationId
                const row = {
                    id,
                    conversationId: id,
                    clientId: chat.clientId,
                    name: chat.name,
                    avatarColor: chat.avatarColor,
                    lastMessage: res.message.text,
                    lastMessageAt: res.message.createdAt,
                    unread: 0,
                }
                setConversations((prev) => {
                    const idx = prev.findIndex((c) => (c.conversationId || c.id) === id)
                    if (idx < 0) return [row, ...prev]
                    const n = [...prev]
                    n[idx] = { ...row, ...n[idx], name: n[idx].name || row.name, avatarColor: n[idx].avatarColor || row.avatarColor }
                    return n
                })
                setNewChat((prev) => (prev?.clientId === chat.clientId ? null : prev))
                setActiveId(id)
            }
            setMessages((prev) => {
                if (prev.some((m) => m.id === res.message.id)) return prev
                return [...prev, res.message]
            })
        })
        setDrafts((prev) => ({ ...prev, [threadKey]: '' }))
    }

    const closeThread = () => {
        setActiveId(null)
        setNewChat(null)
    }

    const handleTyping = (val) => {
        setDrafts((prev) => ({ ...prev, [threadKey]: val }))
        const s = socketRef.current
        if (s && activeId) s.emit('typing', { conversationId: activeId, isTyping: !!val.trim() })
    }

    const filtered = conversations.filter((c) =>
        (c.clientName || c.name || '').toLowerCase().includes(search.trim().toLowerCase()),
    )

    const pickable = clients.filter((c) =>
        (c.name || '').toLowerCase().includes(pickSearch.trim().toLowerCase()),
    )

    const fmtTime = (d) => {
        if (!d) return ''
        const dt = new Date(d)
        return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    if (loading) return <PageSpin />
    if (loadError) return <div className="app-card"><SectionError title="Couldn't load your conversations" error={loadError} onRetry={loadConversations} /></div>

    return (
        <div className="chat-shell flex" style={{ height: 'calc(100vh - 190px)', minHeight: 480 }}>
            <div className={`chat-hairline w-full shrink-0 flex-col sm:flex sm:w-80 lg:w-96 ${active ? 'hidden sm:flex' : 'flex'}`}>
                <div className="px-5 pb-3 pt-5">
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="text-lg font-extrabold tracking-tight text-text-primary">Messages</div>
                        <Tooltip title="New message">
                            <Button type="text" shape="circle" icon={<EditOutlined />} onClick={() => setPicking(true)} aria-label="New message" />
                        </Tooltip>
                    </div>
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} prefix={<SearchOutlined style={{ color: 'var(--color-text-muted)' }} />} placeholder="Search conversations…" variant="filled" style={{ borderRadius: 999 }} />
                </div>
                <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
                    {filtered.length === 0 && (
                        <div className="px-4 py-8 text-center text-sm text-text-muted">
                            <div>No conversations yet</div>
                            <Button className="mt-3" type="primary" icon={<EditOutlined />} onClick={() => setPicking(true)}>New message</Button>
                        </div>
                    )}
                    {filtered.map((c) => {
                        const cId = c.conversationId || c.id
                        const isActive = cId === activeId
                        return (
                            <button key={cId} onClick={() => openConversation(cId)} className={`chat-conv flex w-full items-center gap-3 px-3 py-3 text-left ${isActive ? 'chat-conv-active' : ''}`}>
                                <UserAvatar name={c.clientName || c.name || 'Client'} color={c.clientAvatar || c.avatarColor} size={46} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="truncate text-sm font-semibold text-text-primary">{c.clientName || c.name}</span>
                                    </div>
                                    <div className="mt-0.5 flex items-center justify-between gap-2">
                                        <span className={`truncate text-xs ${c.unread ? 'font-semibold text-text-secondary' : 'text-text-muted'}`}>{c.lastMessage || 'No messages'}</span>
                                        {(c.unread || 0) > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white" style={{ background: 'var(--color-primary)' }}>{c.unread}</span>}
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className={`min-w-0 flex-1 flex-col ${active ? 'flex' : 'hidden sm:flex'}`}>
                {!active ? (
                    <div className="flex flex-1 items-center justify-center"><EmptyState title="Select a conversation" description="Choose a client to start chatting." icon={<SendOutlined />} action={<Button type="primary" icon={<EditOutlined />} onClick={() => setPicking(true)}>New message</Button>} /></div>
                ) : (
                    <>
                        <div className="flex items-center gap-3 px-5 py-4">
                            <Button className="sm:hidden" type="text" icon={<ArrowLeftOutlined />} onClick={closeThread} />
                            <UserAvatar name={active.clientName || active.name || 'Client'} color={active.clientAvatar || active.avatarColor} size={44} />
                            <div>
                                <div className="text-sm font-bold text-text-primary">{active.clientName || active.name}</div>
                                <div className="text-xs text-text-muted">{typing?.conversationId === activeId && typing?.isTyping ? 'typing…' : 'Client'}</div>
                            </div>
                        </div>
                        <div className="chat-canvas flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                            {threadLoading && messages.length === 0 ? (
                                <div className="mx-auto max-w-3xl"><Skeleton active paragraph={{ rows: 6 }} /></div>
                            ) : threadError && messages.length === 0 ? (
                                <div className="flex h-full items-center justify-center">
                                    <SectionError title="Couldn't load this conversation" error={{ message: threadError }} onRetry={() => openConversation(activeId)} />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex h-full items-center justify-center"><EmptyState title="No messages yet" description="Say hello to get started." /></div>
                            ) : (
                                <div className="mx-auto flex max-w-3xl flex-col">
                                    {messages.map((m, i) => {
                                        const mine = m.from === 'trainer'
                                        const grouped = messages[i - 1]?.from === m.from
                                        return (
                                            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} ${grouped ? 'mt-1' : 'mt-3'} first:mt-0`}>
                                                <div className={`max-w-[76%] px-3.5 py-2 text-sm ${mine ? 'chat-bubble-out' : 'chat-bubble-in'}`} style={{ borderRadius: 18, ...(mine ? { borderBottomRightRadius: grouped ? 18 : 6 } : { borderBottomLeftRadius: grouped ? 18 : 6 }) }}>
                                                    <div className="whitespace-pre-wrap break-words">{m.text}</div>
                                                    <div className="mt-0.5 text-right text-[10px]" style={{ opacity: 0.65 }}>{fmtTime(m.createdAt)}</div>
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
                                <Input value={drafts[threadKey] || ''} onChange={(e) => handleTyping(e.target.value)} onPressEnter={send} placeholder="Type a message…" variant="borderless" style={{ padding: 0, background: 'transparent' }} />
                                <Button type="primary" shape="circle" size="large" icon={<SendOutlined />} onClick={send} />
                            </div>
                        </div>
                    </>
                )}
            </div>

            <Modal
                open={picking}
                onCancel={() => { setPicking(false); setPickSearch('') }}
                footer={null}
                title={<ModalTitle icon={<EditOutlined />} title="New message" subtitle="Pick a client to start chatting" />}
                destroyOnClose
            >
                <Input autoFocus value={pickSearch} onChange={(e) => setPickSearch(e.target.value)} prefix={<SearchOutlined style={{ color: 'var(--color-text-muted)' }} />} placeholder="Search clients…" variant="filled" style={{ borderRadius: 999 }} />
                <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
                    {clientsLoading ? (
                        <Skeleton active avatar paragraph={{ rows: 2 }} />
                    ) : pickable.length === 0 ? (
                        <div className="py-6 text-center text-sm text-text-muted">No clients found</div>
                    ) : pickable.map((c) => (
                        <button key={c.id} onClick={() => pickClient(c)} className="chat-conv flex w-full items-center gap-3 px-3 py-2.5 text-left">
                            <UserAvatar name={c.name || 'Client'} src={c.avatarUrl || undefined} color={c.avatarColor} size={38} />
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold text-text-primary">{c.name}</div>
                                {c.goal && <div className="truncate text-xs text-text-muted">{c.goal}</div>}
                            </div>
                        </button>
                    ))}
                </div>
            </Modal>
        </div>
    )
}
