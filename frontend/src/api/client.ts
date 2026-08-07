// 统一 API 客户端: JSON 解析、401 处理、超时、错误对象
import { toast } from '../app/toast'

export class ApiError extends Error {
  status: number
  detail: unknown
  constructor(status: number, message: string, detail?: unknown) {
    super(message)
    this.status = status
    this.detail = detail
  }
}

const TIMEOUT = 30_000

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)
  try {
    const resp = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      signal: controller.signal,
    })
    if (resp.status === 401) {
      // 触发全局认证失效
      window.dispatchEvent(new CustomEvent('panel-auth-expired'))
      throw new ApiError(401, '未认证或会话已过期')
    }
    const text = await resp.text()
    let data: unknown = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = text
      }
    }
    if (!resp.ok) {
      const msg =
        (data as { message?: string } | null)?.message ||
        (data as { detail?: string } | null)?.detail ||
        `请求失败 (HTTP ${resp.status})`
      throw new ApiError(resp.status, msg, data)
    }
    return data as T
  } catch (e) {
    if (e instanceof ApiError) throw e
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new ApiError(0, '请求超时')
    }
    throw new ApiError(0, `网络错误: ${e instanceof Error ? e.message : String(e)}`)
  } finally {
    clearTimeout(timer)
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
}

// 写操作失败时的统一 Toast 提示
export function toastError(e: unknown) {
  if (e instanceof ApiError) {
    toast.error(e.message)
  } else if (e instanceof Error) {
    toast.error(e.message)
  } else {
    toast.error('操作失败')
  }
}
