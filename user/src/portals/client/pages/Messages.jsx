import { useState, useRef, useEffect } from 'react'
import { Input, Button } from 'antd'
import { SendOutlined } from '@ant-design/icons'
import UserAvatar from '../../../components/common/UserAvatar'
import EmptyState from '../../../components/common/EmptyState'
import { useAuth } from '../../../context/AuthContext'
import { getSocket } from '../../../services/socket'

export default function Messages() {
    const { client } = useAuth()
    const trainerInfo = client?.trainer
    const trainerName = trainerInfo?.user?.name || 'Your Trainer'
    const trainerColor = trainerInfo?.user?.avatarColor || '#0b2545'

    const [messages, setMessages] = useState([])
    const [draft, setDraft] = useState('')
    const [typing, setTyping] = useState(false)
    const [convoId, setConvoId] = useState(null)
    const endRef = useRef(null)
    const socketRef = useRef(null)

    // Connect and open conversation
    useEffect(() => {
        const s = getSocket()
        if (!s) return
        socketRef.current = s

        // Open conversation with assigned trainer
        s.emit('conversation:open', {}, (res) => {
            if (res?.ok) {
                setConvoId(res.conversationId)
                setMessages(res.messages || [])
            }
        })

        s.on('message:new', (payload) => {
            if (!payload?.message) return
            setMessages((prev) => {
                if (prev.some((m) => m.id === payload.message.id)) return prev
                return [...prev, payload.message]
            })
        })

        s.on('typing', (payload) => {
            if (payload?.from === 'trainer') {
                setTyping(!!payload.isTyping)
                if (payload.isTyping) setTimeout(() => setTyping(false), 3000)
            }
        })

        return () => {
            s.off('message:new')
            s.off('typing')
            if (convoId) s.emit('conversation:leave', { conversationId: convoId })
        }
    }, [])

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages.length])

    const send = () => {
        const text = draft.trim()
        if (!text) return
        const s = socketRef.current
        if (!s) return
        s.emit('message:send', { conversationId: convoId, text }, (res) => {
            if (res?.ok && res.message) {
                setMessages((prev) => {
                    if (prev.some((m) => m.id === res.message.id)) return prev
                    return [...prev, res.message]
                })
            }
        })
        setDraft('')
    }

    const handleTyping = (val) => {
        setDraft(val)
        const s = socketRef.current
        if (s && convoId) s.emit('typing', { conversationId: convoId, isTyping: !!val.trim() })
    }

    const fmtTime = (d) => {
        if (!d) return ''
        return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div className="chat-shell flex flex-col" style={{ height: 'calc(100vh - 190px)', minHeight: 480 }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4">
                <UserAvatar name={trainerName} color={trainerColor} size={44} />
                <div>
                    <div className="text-sm font-bold text-text-primary">{trainerName}</div>
                    <div className="text-xs" style={{ color: typing ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                        {typing ? 'typing…' : 'Your trainer'}
                    </div>
                </div>
            </div>

            {/* Thread */}
            <div className="chat-canvas flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                {messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                        <EmptyState title="No messages yet" description="Say hello to your trainer." />
                    </div>
                ) : (
                    <div className="mx-auto flex max-w-3xl flex-col">
                        {messages.map((m, i) => {
                            const mine = m.from === 'client'
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

            {/* Composer */}
            <div className="chat-composer p-3 sm:p-4">
                <div className="chat-field mx-auto flex max-w-3xl items-center gap-2 py-1.5 pl-4 pr-1.5">
                    <Input value={draft} onChange={(e) => handleTyping(e.target.value)} onPressEnter={send} placeholder="Message your trainer…" variant="borderless" style={{ padding: 0, background: 'transparent' }} />
                    <Button type="primary" shape="circle" size="large" icon={<SendOutlined />} onClick={send} />
                </div>
            </div>
        </div>
    )
}
