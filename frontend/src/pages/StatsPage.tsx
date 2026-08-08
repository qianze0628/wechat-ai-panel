// 数据统计 (仿 AstrBot 数据统计): 消息量 / 活跃联系人 / 群活跃
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, BarChart3, MessageSquare, Users, Hash, Clock } from 'lucide-react'
import { panelApi } from '../api'

export default function StatsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['messages-stats'],
    queryFn: () => panelApi.messages({ limit: 500 }),
    refetchInterval: 30000,
  })

  const stats = useMemo(() => {
    // 后端消息字段: {timestamp, type, typeName, isText, room: bool, contact, talker, receiver, self, text}
    const msgs = (data?.messages ?? []) as unknown as {
      text?: string
      talker?: string
      contact?: string
      receiver?: string
      room?: boolean
      time?: string
    }[]
    const total = msgs.length
    const rooms = new Map<string, number>()
    const senders = new Map<string, number>()
    for (const m of msgs) {
      // 会话名: contact 存在即群/联系人, room bool 勿当名字
      const r = m.contact || (m.room ? '(群聊)' : '(私聊)')
      rooms.set(r, (rooms.get(r) ?? 0) + 1)
      const sender = m.talker || m.receiver || '(未知)'
      senders.set(sender, (senders.get(sender) ?? 0) + 1)
    }
    const topRooms = [...rooms.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    const topSenders = [...senders.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    return { total, topRooms, topSenders }
  }, [data])

  if (isLoading || !data) {
    return (
      <div className="flex h-full items-center justify-center text-foreground-muted">
        <Loader2 className="mr-2 animate-spin" size={18} /> 统计中…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">数据统计</h1>
        <p className="mt-0.5 text-[13px] text-foreground-muted">最近 500 条消息概览</p>
      </div>

      {/* 总览卡 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <MessageSquare size={18} className="text-primary-500" />
          <div className="mt-2 text-2xl font-bold text-foreground">{stats.total}</div>
          <div className="text-[12px] text-foreground-muted">总消息数</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <Users size={18} className="text-primary-500" />
          <div className="mt-2 text-2xl font-bold text-foreground">{stats.topSenders.length}</div>
          <div className="text-[12px] text-foreground-muted">活跃联系人 (Top)</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <Hash size={18} className="text-primary-500" />
          <div className="mt-2 text-2xl font-bold text-foreground">{stats.topRooms.length}</div>
          <div className="text-[12px] text-foreground-muted">活跃会话 (Top)</div>
        </div>
      </div>

      {/* 活跃群/会话 */}
      <div className="rounded-2xl border border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <BarChart3 size={15} className="text-primary-500" />
          <span className="text-[14px] font-semibold text-foreground">活跃会话</span>
        </div>
        <div className="divide-y divide-border/60">
          {stats.topRooms.length === 0 && (
            <div className="p-4 text-[12.5px] text-foreground-muted">暂无消息数据</div>
          )}
          {stats.topRooms.map(([room, count], i) => (
            <div key={room} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-6 text-center text-[12px] font-semibold text-foreground-muted">#{i + 1}</span>
              <span className="flex-1 truncate text-[13px] text-foreground">{room}</span>
              <span className="text-[12px] text-foreground-muted">{count} 条</span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-solid">
                <div
                  className="h-full rounded-full bg-primary-500"
                  style={{ width: `${stats.total > 0 ? Math.min(100, (count / stats.total) * 100) : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 活跃联系人 */}
      <div className="rounded-2xl border border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Users size={15} className="text-primary-500" />
          <span className="text-[14px] font-semibold text-foreground">活跃联系人</span>
        </div>
        <div className="divide-y divide-border/60">
          {stats.topSenders.length === 0 && (
            <div className="p-4 text-[12.5px] text-foreground-muted">暂无消息数据</div>
          )}
          {stats.topSenders.map(([sender, count], i) => (
            <div key={sender} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-6 text-center text-[12px] font-semibold text-foreground-muted">#{i + 1}</span>
              <span className="flex-1 truncate text-[13px] text-foreground">{sender}</span>
              <span className="text-[12px] text-foreground-muted">{count} 条</span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-solid">
                <div
                  className="h-full rounded-full bg-success"
                  style={{ width: `${stats.total > 0 ? Math.min(100, (count / stats.total) * 100) : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-3.5 text-[12px] text-foreground-muted">
        <Clock size={12} className="mr-1 inline" />
        基于 wechat-bot 本地消息记录统计, 每 30 秒刷新。
      </div>
    </div>
  )
}