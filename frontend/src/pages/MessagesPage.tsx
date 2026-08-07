// 消息记录: 微信聊天记录查看 (messages.jsonl)
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  MessagesSquare,
  Loader2,
  Search,
  Users,
  User,
  RefreshCw,
  Inbox,
  FileImage,
  File,
} from 'lucide-react'
import { panelApi } from '../api'
import type { ChatMessage } from '../types/api'

function fmtTime(ts: string) {
  if (!ts) return ''
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ts
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (sameDay) return hm
  return `${d.getMonth() + 1}/${d.getDate()} ${hm}`
}

export default function MessagesPage() {
  const [active, setActive] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  // 消息列表自动滚动到底部 (显示最新) — ref 声明, effect 在 currentMessages 定义后挂载
  const scrollRef = useRef<HTMLDivElement>(null)

  // 会话列表 (先不筛选, 加载联系人)
  const list = useQuery({
    queryKey: ['messages', active, q],
    queryFn: () => panelApi.messages({ contact: active ?? '', search: q, limit: 200 }),
    refetchInterval: 10000,
  })

  const data = list.data
  const messages: ChatMessage[] = data?.messages ?? []

  // 会话分组统计 (从 contacts + 当前消息)
  const currentMessages = useMemo(() => messages, [messages])
  // 当前会话是否群聊 (从会话列表推断)
  const activeContact = (data?.contacts ?? []).find((c) => c.name === active)
  const activeIsRoom = activeContact?.room ?? false

  // 打开会话/新消息到达时自动滚动到底部 (显示最新)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [active, currentMessages])

  return (
    <div className="flex h-full flex-col gap-4">
      {/* 标题 + 搜索 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <MessagesSquare size={18} className="text-primary-500" />
          <h1 className="text-xl font-bold tracking-tight text-foreground">消息记录</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative ml-2">
            <Search size={13} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-foreground-muted/50" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') setQ(search) }}
              placeholder="搜索消息或联系人…"
              className="h-8 w-52 rounded-lg border border-border bg-surface-solid pr-2 pl-8 text-[12.5px] text-foreground placeholder:text-foreground-muted/50 focus:border-primary-400 focus:outline-none"
            />
          </div>
          <button
            onClick={() => { setQ(search); list.refetch() }}
            className="flex h-8 items-center gap-1 rounded-lg bg-primary-500 px-3 text-[12.5px] font-semibold text-white"
          >
            搜索
          </button>
          <button
            onClick={() => { list.refetch() }}
            title="刷新"
            aria-label="刷新消息"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-foreground-muted hover:text-primary-500"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex flex-1 gap-4">
        {/* 左: 会话列表 */}
        <div className="w-64 shrink-0 overflow-y-auto rounded-2xl border border-border bg-surface p-2 backdrop-blur-xl">
          {list.isLoading ? (
            <div className="flex h-24 items-center justify-center text-foreground-muted">
              <Loader2 className="mr-2 animate-spin" size={15} /> 加载会话…
            </div>
          ) : (data?.contacts?.length ?? 0) === 0 && q ? (
            <div className="p-4 text-center text-[12.5px] text-foreground-muted">无匹配会话</div>
          ) : (
            <div className="space-y-0.5">
              {(data?.contacts ?? []).map((c) => (
                <button
                  key={c.name}
                  onClick={() => setActive(c.name)}
                  className={`flex w-full flex-col rounded-lg px-2.5 py-2 text-left transition-colors ${
                    active === c.name ? 'bg-primary-50 text-primary-600' : 'text-foreground-muted hover:bg-primary-50/50'
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate text-[13px] font-medium">
                    {c.room ? <Users size={13} className="shrink-0" /> : <User size={13} className="shrink-0" />}
                    <span className="truncate">{c.name || '(空)'}</span>
                  </span>
                  <span className="mt-0.5 pl-4 text-[11px] text-foreground-muted/70">{c.count} 条消息</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 右: 消息流 */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface backdrop-blur-xl">
          {/* 会话头 */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            {active ? (
              <>
                {activeIsRoom ? <Users size={15} className="text-primary-500" /> : <User size={15} className="text-primary-500" />}
                <span className="truncate text-[14px] font-semibold text-foreground">{active}</span>
                <span className="ml-auto text-[12px] text-foreground-muted">{currentMessages.length} 条</span>
              </>
            ) : (
              <span className="text-[13px] text-foreground-muted">选择左侧会话查看消息</span>
            )}
          </div>

          {/* 消息列表 (自动滚动到底部) */}
          <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
            {!active ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-foreground-muted">
                <Inbox size={32} className="text-foreground-muted/30" />
                <span className="text-[12.5px]">从左侧选择一个联系人查看聊天记录</span>
              </div>
            ) : currentMessages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[12.5px] text-foreground-muted">
                该会话暂无文本消息
              </div>
            ) : (
              currentMessages.map((m, i) => (
                <MessageBubble key={`${m.timestamp}-${i}`} msg={m} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ===== 单条消息气泡 =====
function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isSelf = msg.self
  const isText = msg.isText && msg.text.trim()
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.12 }}
      className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[75%] ${isSelf ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* 非本人的群消息显示发送者 */}
        {!isSelf && msg.room && msg.talker && (
          <div className="mb-0.5 px-1 text-[11px] text-foreground-muted">{msg.talker}</div>
        )}
        <div
          className={`rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed break-words ${
            isSelf
              ? 'rounded-br-sm bg-primary-500 text-white'
              : 'rounded-bl-sm bg-surface-solid text-foreground'
          }`}
        >
          {isText ? (
            <span className="whitespace-pre-wrap">{msg.text}</span>
          ) : (
            <span className="flex items-center gap-1.5 text-foreground-muted">
              {msg.type === 3 || msg.type === 6 ? <FileImage size={14} /> : <File size={14} />}
              {msg.typeName || '非文本消息'}
            </span>
          )}
        </div>
        <div className={`px-1 pt-0.5 text-[10.5px] text-foreground-muted/70 ${isSelf ? 'text-right' : ''}`}>
          {fmtTime(msg.timestamp)}
        </div>
      </div>
    </motion.div>
  )
}