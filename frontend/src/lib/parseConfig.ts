// 统一解析 cmd-config 返回值: 后端 config 可能是 JSON 对象或字符串, 兼容两者
export function parseConfig(config: unknown): Record<string, unknown> {
  if (typeof config === 'string') {
    try {
      return JSON.parse(config) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  if (config && typeof config === 'object') {
    return config as Record<string, unknown>
  }
  return {}
}

// 序列化回写 (后端存 JSON 字符串)
export function stringifyConfig(config: Record<string, unknown>): string {
  return JSON.stringify(config)
}