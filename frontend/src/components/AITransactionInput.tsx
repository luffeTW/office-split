import { useState, useEffect } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CreateTransactionDto } from '../services/transactionService'
import apiClient from '../services/api'

interface AITransactionInputProps {
  groupId: number
  onParsed: (data: CreateTransactionDto) => void
}

export function AITransactionInput({ groupId, onParsed }: AITransactionInputProps) {
  const [enabled, setEnabled] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Check if AI is enabled
    apiClient.get<{ enabled: boolean }>('/ai/config')
      .then(res => setEnabled(res.data.enabled))
      .catch(() => setEnabled(false))
  }, [])

  const handleParse = async () => {
    if (!input.trim()) return
    setLoading(true)
    setError('')

    try {
      const response = await apiClient.post<CreateTransactionDto>('/ai/parse-transaction', {
        text: input,
        groupId
      })
      onParsed(response.data)
      setInput('') // Clear input on success
    } catch (err: any) {
      console.error(err)
      setError(err?.response?.data?.message || 'AI 解析失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  if (!enabled) return null

  return (
    <div className="mb-6 rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
        <Sparkles className="h-4 w-4" />
        <span>AI 智慧記帳</span>
      </div>
      <div className="space-y-3">
        <Textarea
          placeholder="輸入範例：午餐 500 元，我先付 (或：計程車 300 Alice 先付)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="min-h-[80px] resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {error && <span className="text-red-500">{error}</span>}
          </span>
          <Button 
            size="sm" 
            onClick={handleParse} 
            disabled={loading || !input.trim()}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                解析中...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                智慧解析
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
