import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { authService } from '../services/authService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const response = await authService.login({ username, password })
      login(response.token, response.user)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.message || '登入失敗')
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-md">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">債主版</h1>
        <p className="mt-1 text-muted-foreground">登入</p>
      </div>
      <div className="mt-6 rounded-lg border bg-card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="space-y-2">
            <Label htmlFor="username">用戶名</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密碼</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full">登入</Button>
          <div className="text-center text-sm">
            <Link to="/register" className="text-primary underline-offset-4 hover:underline">
              還沒有帳號？立即註冊
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
