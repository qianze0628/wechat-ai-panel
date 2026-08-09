// ChatUI (仿 AstrBot): 链路测试聊天 — 消息走 信息→wechatbot→AstrBot→模型 完整链路
// 发送: /api/chat/send (注入 wechat-bot) → 回复: /api/chat/replies (从日志解析)
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Send, Bot, User, MessageSquare } from 'lucide-react'
import { api } from '../api/client'
import { toast } from '../app/toast'

interface ChatMsg { role: 'user' | 'bot'; text: string; time: string }
interface Reply { text: string; time: number }

export default function ChatPage() {
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [lastReplyCount, setLastReplyCount] = useState(0)
  const [userId, setUserId] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // 轮询回复 (每 3s 查新回复)
  const { data: repliesData } = useQuery({
    queryKey: ['chat-replies', userId],
    queryFn: () => api.get<{ ok: boolean; replies: Reply[] }>(`/api/chat/replies${userId ? `?user=${userId}` : ''}`),
    refetchInterval: 3000,
  })

  // 新回复 → 追加到对话
  useEffect(() => {
    const replies = repliesData?.replies ?? []
    if (replies.length > lastReplyCount) {
      const fresh = replies.slice(0, replies.length - lastReplyCount).reverse()
      for (const r of fresh) {
        setMsgs((prev) => [
          ...prev,
          { role: 'bot', text: r.text, time: new Date(r.time * 1000).toLocaleTimeString() },
        ])
      }
      setLastReplyCount(replies.length)
    }
  }, [repliesData, lastReplyCount])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setMsgs((prev) => [...prev, { role: 'user', text, time: new Date().toLocaleTimeString() }])
    setInput('')
    try {
      const r = await api.get<{ ok: boolean; message: string; userId?: string }>(`/api/chat/send?text=${encodeURIComponent(text)}`)
      if (r.userId) setUserId(r.userId)
      toast.success(r.message || '已发送')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '发送失败 (链路不通)')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-[860px] flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between rounded-t-2xl border border-border bg-surface px-5 py-3">
        <div className="flex items-center gap-2">
          <Bot size={17} className="text-primary-500" />
          <span className="text-[14.5px] font-semibold text-foreground">链路测试聊天</span>
          <span className="rounded-full bg-primary-500/10 px-2 py-0.5 text-[11px] font-medium text-primary-500">
            信息→wechatbot→AstrBot→模型
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11.5px] text-foreground-muted">
          <span className="flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${userId ? 'bg-success' : 'bg-warning'}`} /> {userId ? '链路在线' : '发送后可测试'}</span>
        </div>
      </div>

      {/* 聊天区 */}
      <div className="flex-1 space-y-3 overflow-y-auto border-x border-border bg-surface/40 p-4">
        {msgs.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-foreground-muted">
            <MessageSquare size={28} className="opacity-40" />
            <div className="text-[13px]">发送一条消息测试完整链路</div>
            <div className="text-[11.5px]">回复由 AstrBot 模型生成后显示在这里</div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                m.role === 'user'
                  ? 'bg-primary-500 text-white'
                  : 'border border-border bg-surface text-foreground'
              }`}
            >
              <div className="mb-1 flex items-center gap-1.5 text-[10.5px] opacity-70">
                {m.role === 'user' ? <User size={10} /> : <Bot size={10} />}
                {m.role === 'user' ? '我' : 'AstrBot'} · {m.time}
              </div>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 输入区 */}
      <div className="flex items-center gap-2 rounded-b-2xl border border-border bg-surface p-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="输入消息测试链路… (回车发送)"
          className="h-10 flex-1 rounded-lg border border-border bg-surface-solid px-3.5 text-[13.5px] text-foreground placeholder:text-foreground-muted/50 focus:border-primary-400 focus:outline-none"
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          className="flex h-10 items-center gap-1.5 rounded-lg bg-primary-500 px-4 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} 发送
        </button>
      </div>

      <div className="mt-2 text-center text-[11px] text-foreground-muted">
        消息经 wechat-bot 注入 AstrBot 完整链路; 回复由模型生成后显示 (每 3 秒轮询)。发送失败 = 链路不通。
      </div>
    </div>
  )
}