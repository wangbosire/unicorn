import { useSearch } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })

  return (
    <AuthLayout>
      <Card className='max-w-sm gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>后台登录</CardTitle>
          <CardDescription>
            请输入用户名与密码。首次本地开发请在 `apps/api` 执行
            `pnpm exec prisma db seed` 写入种子账号（见页脚说明）。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserAuthForm redirectTo={redirect} />
        </CardContent>
        <CardFooter className='flex flex-col gap-2'>
          <p className='w-full rounded-md border border-dashed bg-muted/40 px-3 py-2 text-start text-xs text-muted-foreground'>
            种子账号（执行 db seed 后）：超级管理员{' '}
            <span className='font-mono text-foreground'>admin</span> /{' '}
            <span className='font-mono text-foreground'>Admin123!</span>；仅仪表盘访客{' '}
            <span className='font-mono text-foreground'>viewer</span> /{' '}
            <span className='font-mono text-foreground'>Viewer123!</span>
          </p>
          <p className='px-2 text-center text-xs text-muted-foreground'>
            点击登录即表示同意服务条款与隐私政策（演示环境）。
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
