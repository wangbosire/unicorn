import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type ModulePageProps = {
  title: string
  description: string
  status?: string
}

export function ModulePage({
  title,
  description,
  status = 'Bootstrap Ready',
}: ModulePageProps) {
  return (
    <>
      <Header>
        <div className='me-auto'>
          <p className='text-sm text-muted-foreground'>Unicorn Admin</p>
        </div>
        <Search />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className='mb-6 flex items-start justify-between gap-4'>
          <div className='space-y-1'>
            <h1 className='text-2xl font-bold tracking-tight'>{title}</h1>
            <p className='text-sm text-muted-foreground'>{description}</p>
          </div>
          <Badge variant='secondary'>{status}</Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>页面占位</CardTitle>
          </CardHeader>
          <CardContent className='text-sm text-muted-foreground'>
            当前页面已接入后台信息架构，下一步可开始补业务表格、筛选器和操作区。
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
