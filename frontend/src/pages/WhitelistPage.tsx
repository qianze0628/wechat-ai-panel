// 白名单与管理员: 微信联系人列表 + 白名单/管理员分配 (同步至 AstrBot + wechat-bot)
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from '../app/toast'
import {
  ShieldCheck,
  Shield,
  Users,
  Search,
  Loader2,
  Save,
  RefreshCw,
  CircleCheck,
  TriangleAlert,
  UserCheck,
  UsersRound,
  Filter,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { panelApi } from '../api'
import type { WhitelistRoom } from '../types/api'

export default function WhitelistPage() {
  // 联系人/群列表
  const { data: contactsData, isLoading, refetch: refetchContacts } = useQuery({
    queryKey: ['wl-contacts'],
    queryFn: panelApi.whitelistContacts,
  })
  // 当前白名单状态
  const { data: wl, refetch: refetchWl } = useQuery({
    queryKey: ['wl-state'],
    queryFn: panelApi.whitelistGet,
  })

  const [chatIds, setChatIds] = useState<Set<string>>(new Set())
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  // 初次加载后同步勾选状态 (仅同步一次, 避免用户改动被覆盖)
  const syncedRef = useRef(false)
  useEffect(() => {
    if (wl && !syncedRef.current) {
      syncedRef.current = true
      setChatIds(new Set((wl.chatIds ?? []).map(String)))
      setAdminIds(new Set((wl.adminIds ?? []).map(String)))
    }
  }, [wl])

  const contacts = contactsData?.contacts
  const rooms = contactsData?.rooms

  // 分组: 真人 vs 公众号/服务号
  const userContacts = (contacts ?? []).filter((c) => !c.isOfficial)
  const officialContacts = (contacts ?? []).filter((c) => c.isOfficial)
  const [showOfficial, setShowOfficial] = useState(false)
  const [onlyConfigured, setOnlyConfigured] = useState(false)
  const [hideUnchatted, setHideUnchatted] = useState(true)

  // 联系人同步重试: wechat4u 刚登录时只返回部分, 自动重试拉全
  const [retryCount, setRetryCount] = useState(0)
  const totalSeen = contacts?.length ?? 0
  const looksIncomplete = totalSeen > 0 && totalSeen < 300 && retryCount < 3

  // 根据 tab 显示真人或公众号
  const baseContacts = showOfficial ? officialContacts : userContacts
  const filteredContacts = baseContacts.filter((c) => {
    // 隐藏未互动联系人 (群成员/单向好友通常没私聊过): 默认开启
    if (hideUnchatted) {
      const inChat = chatIds.has(String(c.hashId))
      const isAdmin = adminIds.has(String(c.hashId))
      if (inChat || isAdmin) {
        // 保留已设置的, 继续
      } else if (!c.chatted) {
        return false // 未聊过且未设置 → 隐藏 (群成员等)
      }
    }
    // 仅显示已设置白名单或管理员
    if (onlyConfigured) {
      const inChat = chatIds.has(String(c.hashId))
      const isAdmin = adminIds.has(String(c.hashId))
      if (!inChat && !isAdmin) return false
    }
    const kw = search.trim().toLowerCase()
    if (!kw) return true
    return (c.name || '').toLowerCase().includes(kw) || (c.rawName || '').toLowerCase().includes(kw) || (c.alias || '').toLowerCase().includes(kw) || String(c.hashId).includes(kw)
  })
  const filteredRooms = (rooms ?? []).filter((r) => {
    const kw = search.trim().toLowerCase()
    if (!kw) return true
    return (r.name || '').toLowerCase().includes(kw) || String(r.hashId).includes(kw)
  })

  function toggleChat(hashId: string) {
    setChatIds((prev) => {
      const next = new Set(prev)
      if (next.has(hashId)) next.delete(hashId)
      else next.add(hashId)
      return next
    })
    setDirty(true)
  }
  // 群勾选联动: 勾选群 = 群自身 hashId + 所有成员 hashId 一起进入白名单; 取消 = 全部移除
  const [expandedRooms, setExpandedRooms] = useState<Set<number>>(new Set())
  function toggleGroup(room: WhitelistRoom) {
    const memberIds = (room.members ?? []).map((m) => String(m.hashId))
    const selfId = String(room.hashId)
    setChatIds((prev) => {
      const next = new Set(prev)
      const isChecked = prev.has(selfId)
      if (isChecked) {
        next.delete(selfId)
        memberIds.forEach((id) => next.delete(id))
      } else {
        next.add(selfId)
        memberIds.forEach((id) => next.add(id))
      }
      return next
    })
    setDirty(true)
  }
  function toggleRoomExpand(hashId: number) {
    setExpandedRooms((prev) => {
      const next = new Set(prev)
      if (next.has(hashId)) next.delete(hashId)
      else next.add(hashId)
      return next
    })
  }
  function toggleAdmin(hashId: string) {
    setAdminIds((prev) => {
      const next = new Set(prev)
      if (next.has(hashId)) next.delete(hashId)
      else next.add(hashId)
      return next
    })
    setDirty(true)
  }

  async function save() {
    if (saving) return
    setSaving(true)
    try {
      const r = await panelApi.whitelistSave({
        chatIds: [...chatIds],
        adminIds: [...adminIds],
      })
      if (r.status === 'ok') {
        toast.success(r.message || '白名单已保存')
        setDirty(false)
        refetchWl()
        refetchContacts()
      } else {
        toast.error((r as { message?: string }).message || '保存失败')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const adminCount = adminIds.size
  const chatCount = chatIds.size
  // 超级管理员状态 + 切换
  const [superBusy, setSuperBusy] = useState(false)
  const superAdminIds = wl?.superAdminIds ?? []

  async function toggleSuper(id: string) {
    if (superBusy) return
    setSuperBusy(true)
    try {
      const next = new Set(superAdminIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      const r = await panelApi.whitelistSuper([...next])
      toast.success(r.message || '超级管理员已更新')
      refetchWl()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '更新超级管理员失败')
    } finally {
      setSuperBusy(false)
    }
  }
  // 名字映射: 优先 contacts, 再 nameMap (后端从 AstrBot 会话映射构建), 最后用 id
  const nameMap = wl?.nameMap ?? {}
  function lookupName(id: string) {
    const c = (contacts ?? []).find((x) => String(x.hashId) === id) ?? (rooms ?? []).find((r) => String(r.hashId) === id)
    if (c) return c.name
    return nameMap[id] ?? undefined
  }
  const enabled = chatCount > 0
  // 不可见的历史白名单 id: 不在联系人 hashId 也不在群 hashId 中
  const allKnownIds = new Set([
    ...(contacts ?? []).map((c) => String(c.hashId)),
    ...(rooms ?? []).map((r) => String(r.hashId)),
  ])
  const hiddenChatCount = [...chatIds].filter((id) => !allKnownIds.has(id)).length

  if (isLoading || !contactsData) {
    return (
      <div className="flex h-full items-center justify-center text-foreground-muted">
        <Loader2 className="mr-2 animate-spin" size={18} /> 正在加载联系人…
      </div>
    )
  }

  if (contactsData.ok === false) {
    return (
      <div className="mx-auto max-w-[600px] p-10 text-center">
        <TriangleAlert size={32} className="mx-auto text-warning" />
        <div className="mt-3 text-[14px] font-semibold text-foreground">无法获取联系人</div>
        <div className="mt-1 text-[12.5px] text-foreground-muted">
          {contactsData.message || '请确认 wechat-bot 已登录并运行 (端口 6189)。'}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-4">
      {/* 标题 + 状态 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">白名单与管理员</h1>
          <p className="mt-0.5 text-[13px] text-foreground-muted">
            设置哪些微信联系人/群可聊天、哪些是管理员。保存后同步到 AstrBot 并重启 wechat-bot 生效。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium ${
              enabled ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
            }`}
          >
            <CircleCheck size={13} /> 白名单 {enabled ? '已启用' : '关'} · {chatCount} 人
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-primary-100 px-3 py-1 text-[12px] font-medium text-primary-600">
            <ShieldCheck size={13} /> 管理员 {adminCount} 人
          </span>
        </div>
      </div>

      {/* 搜索 + 操作 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={13} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-foreground-muted/50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索联系人/群/ID…"
            className="h-8 w-56 rounded-lg border border-border bg-surface-solid pr-2 pl-8 text-[12.5px] text-foreground placeholder:text-foreground-muted/50 focus:border-primary-400 focus:outline-none"
          />
        </div>
        <button
          onClick={() => refetchContacts()}
          title="刷新"
          aria-label="刷新联系人"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-foreground-muted hover:text-primary-500"
        >
          <RefreshCw size={13} />
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? '保存中…' : dirty ? '保存更改' : '已保存'}
          </button>
        </div>
      </div>

      {/* 说明: 白名单为空 = 所有人可聊 */}
      {!enabled && (
        <div className="flex items-start gap-2 rounded-lg bg-warning/15 p-3 text-[12.5px] text-warning">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" />
          当前白名单为空，表示所有联系人/群都可与机器人对话（无需 @ 即可触发）。勾选联系人后保存即启用白名单限制。
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 左: 联系人 */}
        <div className="glass-panel lg:col-span-2">
          <div className="mb-2 flex flex-wrap items-center gap-2 px-4 pt-4 text-[14px] font-semibold text-foreground">
            <Users size={15} className="text-primary-500" />
            联系人
            <span className="text-[11px] font-normal text-foreground-muted">真人 {userContacts.length} · 公众号 {officialContacts.length}</span>
            <button
              onClick={() => setShowOfficial((v) => !v)}
              className={`rounded-full px-2.5 py-0.5 text-[11px] transition-colors ${
                showOfficial ? 'bg-primary-100 text-primary-600' : 'bg-surface-solid text-foreground-muted'
              }`}
            >
              {showOfficial ? '显示真人' : '显示公众号'}
            </button>
            <button
              onClick={() => setHideUnchatted((v) => !v)}
              className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] transition-colors ${
                hideUnchatted ? 'bg-success/15 text-success' : 'bg-surface-solid text-foreground-muted'
              }`}
              title={hideUnchatted ? '当前隐藏未互动联系人 (群成员等)。点击显示全部' : '显示全部联系人 (含未互动的群成员)'}
            >
              {hideUnchatted ? <EyeOff size={11} /> : <Eye size={11} />}
              {hideUnchatted ? '隐藏未互动' : '显示全部'}
            </button>
            <button
              onClick={() => setOnlyConfigured((v) => !v)}
              className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] transition-colors ${
                onlyConfigured ? 'bg-primary-600 text-white' : 'bg-surface-solid text-foreground-muted'
              }`}
            >
              <Filter size={11} />
              {onlyConfigured ? '全部' : '仅已设置'}
            </button>
          </div>
          {/* 联系人不全提示 + 自动重试 */}
          {looksIncomplete && (
            <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg bg-warning/15 px-3 py-2 text-[12px] text-warning">
              <TriangleAlert size={13} className="shrink-0" />
              微信联系人仍在同步中（当前 {totalSeen} 人），请稍候或点「刷新联系人」重试。
              <button
                onClick={() => { setRetryCount((n) => n + 1); refetchContacts() }}
                className="ml-auto shrink-0 font-semibold underline"
              >
                立即重试
              </button>
            </div>
          )}
          <div className="max-h-[520px] overflow-y-auto p-2">
            {filteredContacts.slice(0, 100).length === 0 && (
              <div className="p-6 text-center text-[13px] text-foreground-muted">无匹配联系人</div>
            )}
            {filteredContacts.slice(0, 100).map((c) => (
              <div key={c.hashId} className="flex items-center gap-2 rounded-xl px-2.5 py-2 hover:bg-primary-50/50">
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={chatIds.has(String(c.hashId))}
                    onChange={() => toggleChat(String(c.hashId))}
                    className="h-3.5 w-3.5 accent-primary-500"
                  />
                  <span className="min-w-0 flex-1 text-[13px] text-foreground">
                    {c.name || c.rawName}
                    {c.isOfficial && (
                      <span className="ml-1.5 rounded bg-surface-solid px-1 py-px text-[10px] text-foreground-muted">公众号</span>
                    )}
                    {!c.isOfficial && c.alias && c.alias !== c.name && (
                      <span className="ml-1.5 text-[11px] text-foreground-muted">({c.alias})</span>
                    )}
                  </span>
                  <span className="mono text-[10.5px] text-foreground-muted/60">{c.hashId}</span>
                </label>
                <label
                  title={adminIds.has(String(c.hashId)) ? '已设为管理员, 点击取消' : '点击设为管理员'}
                  className={`flex shrink-0 cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-[11px] transition-colors ${
                    adminIds.has(String(c.hashId))
                      ? 'bg-primary-600 text-white'
                      : 'border border-border text-foreground-muted/70 hover:border-primary-300 hover:text-primary-500'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={adminIds.has(String(c.hashId))}
                    onChange={() => toggleAdmin(String(c.hashId))}
                    className="sr-only"
                  />
                  {adminIds.has(String(c.hashId)) ? <ShieldCheck size={12} /> : <Shield size={12} />}
                  <span>{adminIds.has(String(c.hashId)) ? '管理员✓' : '设为管理员'}</span>
                </label>
              </div>
            ))}
            {/* 历史白名单 id (不在联系人列表, 例如旧会话格式) */}
            {hiddenChatCount > 0 && (
              <div className="mt-2 rounded-lg bg-warning/10 px-3 py-2 text-[11.5px] text-warning">
                另有 {hiddenChatCount} 个历史白名单 id 不在当前联系人列表（旧格式），保存时保留。
              </div>
            )}
          </div>
        </div>

        {/* 右: 群 + 管理员列表 */}
        <div className="space-y-4">
          {/* 群聊 */}
          <div className="glass-panel">
            <div className="flex items-center gap-2 px-4 pt-4 text-[14px] font-semibold text-foreground">
              <UsersRound size={15} className="text-primary-500" />
              群聊
              <span className="text-[11px] font-normal text-foreground-muted">{rooms?.length ?? 0} 个</span>
            </div>
            <div className="max-h-[320px] space-y-1 overflow-y-auto p-2">
              {filteredRooms.length === 0 && (
                <div className="p-4 text-center text-[12.5px] text-foreground-muted">无匹配群聊</div>
              )}
              {/* 每个群 = 可折叠卡片; 勾选群 = 群+全部成员进白名单 */}
              {filteredRooms.slice(0, 40).map((r) => {
                const expanded = expandedRooms.has(r.hashId)
                const hasMembers = (r.members?.length ?? 0) > 0
                return (
                  <div key={r.hashId} className="overflow-hidden rounded-lg border border-border">
                    <div className="flex items-center gap-1.5 bg-surface-solid px-2 py-1.5">
                      <button
                        onClick={() => toggleRoomExpand(r.hashId)}
                        aria-label={expanded ? '折叠群' : '展开群'}
                        className="flex h-5 w-5 shrink-0 items-center justify-center text-foreground-muted hover:text-primary-500"
                      >
                        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                      <input
                        type="checkbox"
                        checked={chatIds.has(String(r.hashId))}
                        onChange={() => toggleGroup(r)}
                        className="h-3.5 w-3.5 shrink-0 accent-primary-500"
                      />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                        <span className="mr-1 rounded bg-primary-100 px-1 py-px text-[10px] text-primary-600">群</span>
                        {(r as { fromHist?: boolean }).fromHist && (
                          <span className="mr-1 rounded bg-warning/20 px-1 py-px text-[10px] text-warning">历史</span>
                        )}
                        {r.name}
                      </span>
                      <span className="shrink-0 text-[10.5px] text-foreground-muted/70">
                        {r.memberCount ?? r.members?.length ?? 0} 人
                      </span>
                    </div>
                    {/* 展开: 群成员列表 */}
                    {expanded && (
                      <div className="max-h-[160px] space-y-0.5 overflow-y-auto border-t border-border bg-surface px-2 py-1">
                        {!hasMembers && (
                          <div className="px-2 py-1.5 text-[11.5px] text-foreground-muted">暂未获取到群成员</div>
                        )}
                        {(r.members ?? []).map((m) => {
                          const mid = String(m.hashId)
                          const inWl = chatIds.has(mid)
                          return (
                            <label key={m.rawId} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-primary-50/40">
                              <input
                                type="checkbox"
                                checked={inWl}
                                onChange={() => toggleChat(mid)}
                                className="h-3 w-3 accent-primary-500"
                              />
                              <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground">
                                {m.name && m.name !== '未知名成员' ? m.name : '群成员'}
                              </span>
                              {inWl && <span className="shrink-0 text-[10px] text-success">已入白名单</span>}
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 当前管理员 */}
          <div className="glass-panel">
            <div className="flex items-center gap-2 px-4 pt-4 text-[14px] font-semibold text-foreground">
              <UserCheck size={15} className="text-primary-500" />
              当前管理员
              <span className="text-[11px] font-normal text-foreground-muted">{adminCount} 人</span>
            </div>
            <div className="max-h-[200px] space-y-0.5 overflow-y-auto p-2">
              {/* 管理员列表: 名字优先 (contacts/群名/后端 nameMap), 找不到才显示 ID */}
              {[...adminIds].map((id) => {
                const nm = lookupName(id)
                const isSuper = superAdminIds.includes(id)
                return (
                  <div key={id} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-foreground">
                    <ShieldCheck size={14} className={`shrink-0 ${isSuper ? 'text-primary-600' : 'text-primary-500'}`} />
                    <span className="min-w-0 flex-1 truncate">
                      {nm || `ID ${id}`}
                      {isSuper && (
                        <span className="ml-1.5 rounded bg-primary-600 px-1 py-px text-[10px] font-semibold text-white">超级管理员</span>
                      )}
                      {nm && <span className="ml-1.5 text-[10.5px] text-foreground-muted/70">{id}</span>}
                    </span>
                    <button
                      onClick={() => toggleSuper(id)}
                      disabled={superBusy}
                      className="shrink-0 text-[11px] text-primary-500 hover:underline disabled:opacity-40"
                      title={isSuper ? '取消超级管理员' : '设为超级管理员'}
                    >
                      {isSuper ? '取消超管' : '设为超管'}
                    </button>
                    <button onClick={() => toggleAdmin(id)} className="shrink-0 text-[11px] text-danger hover:underline">
                      移除
                    </button>
                  </div>
                )
              })}
              {/* 非管理员的超级管理员 (若超管在 whitelist 但不在 adminIds, 单独列出) */}
              {superAdminIds
                .filter((sid) => !adminIds.has(sid))
                .map((id) => {
                  const nm = lookupName(id)
                  return (
                    <div key={id} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-foreground">
                      <ShieldCheck size={14} className="shrink-0 text-primary-600" />
                      <span className="min-w-0 flex-1 truncate">
                        {nm || `ID ${id}`}
                        <span className="ml-1.5 rounded bg-primary-600 px-1 py-px text-[10px] font-semibold text-white">超级管理员</span>
                      </span>
                      <button onClick={() => toggleSuper(id)} disabled={superBusy} className="shrink-0 text-[11px] text-primary-500 hover:underline disabled:opacity-40">
                        取消超管
                      </button>
                    </div>
                  )
                })}
              {adminIds.size === 0 && (
                <div className="p-4 text-center text-[12.5px] text-foreground-muted">未设置管理员</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}