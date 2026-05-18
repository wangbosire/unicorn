import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Boxes,
  CheckCheck,
  KeyRound,
  MessageSquareMore,
  ScanSearch,
  Users,
} from 'lucide-react'
import { getDashboardOverview } from '@/apis/dashboard/dashboard'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiError } from '@/lib/api-error'

function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value)
}

function formatGeneratedAt(ms: number): string {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(ms)
  } catch {
    return String(ms)
  }
}

function mapDashboardOverviewErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'ADMIN_AUTH_TOKEN_MISSING':
      case 'ADMIN_AUTH_TOKEN_INVALID':
        return '登录已失效或未携带后台令牌，请重新登录后再试。'
      case 'ADMIN_AUTH_FORBIDDEN':
        return '当前账号无「仪表盘访问」权限，请联系管理员开通。'
      default:
        return error.message || '仪表盘统计加载失败，请稍后重试。'
    }
  }
  return '仪表盘统计加载失败，请检查网络后重试。'
}

export function Dashboard() {
  const { data, error, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'dashboard', 'overview'],
    queryFn: getDashboardOverview,
  })

  const overviewCards = useMemo(() => {
    if (!data) {
      return []
    }

    return [
      {
        title: '激活码总量',
        value: formatNumber(data.activationCodesTotal),
        hint: `已使用 ${formatNumber(data.usedActivationCodesTotal)} 个`,
        icon: KeyRound,
      },
      {
        title: '已领取藏品',
        value: formatNumber(data.claimedCollectionsTotal),
        hint: `待领取 ${formatNumber(data.pendingClaimCollectionsTotal)} 个`,
        icon: Boxes,
      },
      {
        title: '待人工复核内容',
        value: formatNumber(data.pendingManualCollectionReviewsTotal),
        hint: `已公开内容 ${formatNumber(data.publishedContentVersionsTotal)} 个`,
        icon: ScanSearch,
      },
      {
        title: '待人工审核评论',
        value: formatNumber(data.pendingManualCommentsTotal),
        hint: '来自真实评论审核队列',
        icon: MessageSquareMore,
      },
      {
        title: '会员总数',
        value: formatNumber(data.membersTotal),
        hint: `冻结藏品 ${formatNumber(data.frozenCollectionsTotal)} 个`,
        icon: Users,
      },
      {
        title: '已使用激活码',
        value: formatNumber(data.usedActivationCodesTotal),
        hint: `统计生成于 ${formatGeneratedAt(data.generatedAt)}`,
        icon: CheckCheck,
      },
    ]
  }, [data])

  return (
    <PageLayout>
        <div className='mb-6 space-y-1'>
          <h1 className='text-2xl font-bold tracking-tight'>数字藏品平台仪表盘</h1>
          <p className='text-sm text-muted-foreground'>
            面向发行、审核、会员运营和消息触达的一期后台首页。
          </p>
        </div>

        {isLoading ? (
          <div className='py-8 text-center text-muted-foreground'>
            正在加载仪表盘统计…
          </div>
        ) : isError ? (
          <div className='flex flex-col items-center gap-3 py-8'>
            <p className='max-w-md text-center text-destructive'>
              {mapDashboardOverviewErrorMessage(error)}
            </p>
            <Button type='button' variant='outline' size='sm' onClick={() => void refetch()}>
              重试
            </Button>
          </div>
        ) : (
          <>
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
              {overviewCards.map(({ title, value, hint, icon: Icon }) => (
                <Card key={title}>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-sm font-medium'>{title}</CardTitle>
                    <Icon className='h-4 w-4 text-muted-foreground' />
                  </CardHeader>
                  <CardContent>
                    <div className='text-2xl font-bold'>{value}</div>
                    <p className='text-xs text-muted-foreground'>{hint}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className='mt-4 grid gap-4 lg:grid-cols-2'>
              <Card>
                <CardHeader>
                  <CardTitle>当前待办</CardTitle>
                </CardHeader>
                <CardContent className='space-y-2 text-sm text-muted-foreground'>
                  <p>待人工复核内容：{formatNumber(data!.pendingManualCollectionReviewsTotal)} 条</p>
                  <p>待人工审核评论：{formatNumber(data!.pendingManualCommentsTotal)} 条</p>
                  <p>待领取藏品：{formatNumber(data!.pendingClaimCollectionsTotal)} 个</p>
                  <p>已冻结藏品：{formatNumber(data!.frozenCollectionsTotal)} 个</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>统计说明</CardTitle>
                </CardHeader>
                <CardContent className='space-y-2 text-sm text-muted-foreground'>
                  <p>当前仅展示后端已具备真实模型支撑的统计，不虚构通知和转让数据。</p>
                  <p>评论和内容审核队列均来自实时数据库计数，可用于运营待办首页收口。</p>
                  <p>公开内容数：{formatNumber(data!.publishedContentVersionsTotal)} 个。</p>
                  <p>本次统计生成时间：{formatGeneratedAt(data!.generatedAt)}。</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
    </PageLayout>
  )
}
