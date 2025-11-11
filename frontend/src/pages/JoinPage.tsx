import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { groupService } from '../services/groupService'
import { useAuth } from '../hooks/useAuth'
import { Button } from '@/components/ui/button'

function useQuery() {
  return new URLSearchParams(useLocation().search)
}

export default function JoinPage() {
  const query = useQuery()
  const token = query.get('token') || ''
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [status, setStatus] = useState<'idle' | 'joining' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const doJoin = async () => {
    if (!token) {
      setMessage('缺少邀請代碼 (token)')
      setStatus('error')
      return
    }
    setStatus('joining')
    try {
      const res = await groupService.joinByToken(token)
      setMessage(res.message)
      setStatus('done')
    } catch (e: any) {
      setMessage(e?.response?.data?.message || e?.message || '加入失敗')
      setStatus('error')
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      void doJoin()
    } else {
      setMessage('尚未登入，請先登入後再嘗試加入。')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token])

  return (
    <div className="mx-auto mt-16 max-w-md">
      <h1 className="text-2xl font-semibold mb-4">加入群組</h1>
      <div className="rounded border bg-card p-4 space-y-3">
        <div className="text-sm">
          {message || '準備加入...'}
        </div>
        {!isAuthenticated && (
          <Button onClick={() => navigate('/login')} variant="secondary">前往登入</Button>
        )}
        {status === 'done' && (
          <Button onClick={() => navigate('/groups')}>前往群組列表</Button>
        )}
        {status === 'error' && isAuthenticated && (
          <Button onClick={doJoin} variant="destructive">重試</Button>
        )}
      </div>
    </div>
  )
}
