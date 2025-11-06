import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'

function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const currentTab = (() => {
    if (location.pathname === '/') return 'dashboard'
    if (location.pathname.startsWith('/transactions')) return 'transactions'
    if (location.pathname.startsWith('/groups')) return 'groups'
    if (location.pathname.startsWith('/users')) return 'users'
    if (location.pathname.startsWith('/reports')) return 'reports'
    return 'dashboard'
  })()

  const onTabChange = (value: string) => {
    switch (value) {
      case 'dashboard':
        navigate('/'); break
      case 'transactions':
        navigate('/transactions'); break
      case 'groups':
        navigate('/groups'); break
      case 'users':
        navigate('/users'); break
      case 'reports':
        navigate('/reports'); break
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="font-semibold">債主版</div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user?.username}</span>
            <Button variant="ghost" onClick={() => { logout(); navigate('/login') }}>登出</Button>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-2">
          <Tabs value={currentTab} onValueChange={onTabChange}>
            <TabsList>
              <TabsTrigger value="dashboard">儀表板</TabsTrigger>
              <TabsTrigger value="transactions">記帳</TabsTrigger>
              <TabsTrigger value="groups">群組</TabsTrigger>
              <TabsTrigger value="users">使用者</TabsTrigger>
              <TabsTrigger value="reports">報表</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
