import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { authApi } from '../api'
import AuthPage from '../pages/AuthPage'
import AppShell from '../components/shell/AppShell'
import OverviewPage from '../pages/OverviewPage'
import OnboardingPage from '../pages/OnboardingPage'
import ServicesPage from '../pages/ServicesPage'
import ConnectionPage from '../pages/ConnectionPage'
import MessagesPage from '../pages/MessagesPage'
import WhitelistPage from '../pages/WhitelistPage'
import LogsPage from '../pages/LogsPage'
import BackupsPage from '../pages/BackupsPage'
import SettingsPage from '../pages/SettingsPage'
import PluginPage from '../pages/PluginPage'
import PluginCenterPage from '../pages/PluginCenterPage'
import PluginDetailPage from '../pages/PluginDetailPage'

type AuthState = 'loading' | 'ok' | 'need-auth'

export default function App() {
  const [auth, setAuth] = useState<AuthState>('loading')

  // 监听 401 事件 → 回认证页
  useEffect(() => {
    const onExpired = () => setAuth('need-auth')
    window.addEventListener('panel-auth-expired', onExpired)
    return () => window.removeEventListener('panel-auth-expired', onExpired)
  }, [])

  // 初始认证状态
  useEffect(() => {
    let cancelled = false
    authApi
      .status()
      .then((st) => {
        if (cancelled) return
        setAuth(st.enabled && !st.authed ? 'need-auth' : 'ok')
      })
      .catch(() => !cancelled && setAuth('ok'))
    return () => {
      cancelled = true
    }
  }, [])

  if (auth === 'loading') {
    return (
      <div className="flex h-full items-center justify-center bg-background-alt">
        <div className="text-foreground-muted">正在加载面板…</div>
      </div>
    )
  }

  if (auth === 'need-auth') {
    return <AuthPage onAuthed={() => setAuth('ok')} />
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/connection" element={<ConnectionPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/whitelist" element={<WhitelistPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/backups" element={<BackupsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/plugins" element={<PluginCenterPage />} />
        <Route path="/plugins/:id" element={<PluginDetailPage />} />
        <Route path="/plugin/:id" element={<PluginPage />} />
        {/* 仅未知路径回退首页 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}
