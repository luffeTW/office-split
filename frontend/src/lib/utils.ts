import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 將後端回傳的相對檔案路徑（如 /uploads/receipts/...）轉為可直接使用的完整網址
export function buildFileUrl(path?: string | null): string | undefined {
  if (!path) return undefined
  if (/^https?:\/\//i.test(path)) return path
  const api = (import.meta.env.VITE_API_BASE_URL || '').toString()
  const base = api.replace(/\/?api\/?$/i, '') // 去除尾端 /api
  return `${base}${path}`
}
