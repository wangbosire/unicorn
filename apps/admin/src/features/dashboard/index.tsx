import { Bell, Boxes, KeyRound, MessageSquareMore, ScanSearch, Users } from 'lucide-react'
import { PageLayout } from '@/components/layout/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const overviewCards = [
  { title: '激活码总量', value: '0', hint: '等待接入发行统计', icon: KeyRound },
  { title: '已领取藏品', value: '0', hint: '等待接入藏品统计', icon: Boxes },
  { title: '待人工复核', value: '0', hint: '等待接入审核队列', icon: ScanSearch },
  { title: '待审核评论', value: '0', hint: '等待接入评论审核', icon: MessageSquareMore },
  { title: '会员总数', value: '0', hint: '等待接入会员统计', icon: Users },
  { title: '待发送通知', value: '0', hint: '等待接入消息中心', icon: Bell },
]

export function Dashboard() {
  return (
    <PageLayout>
        <div className='mb-6 space-y-1'>
          <h1 className='text-2xl font-bold tracking-tight'>数字藏品平台仪表盘</h1>
          <p className='text-sm text-muted-foreground'>
            面向发行、审核、会员运营和消息触达的一期后台首页。
          </p>
        </div>

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
              <p>待人工复核内容</p>
              <p>待审核评论</p>
              <p>待接收转让单</p>
              <p>即将失效激活码批次</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>下一步接入</CardTitle>
            </CardHeader>
            <CardContent className='space-y-2 text-sm text-muted-foreground'>
              <p>对接真实统计接口</p>
              <p>按 PRD 拆分业务模块页面</p>
              <p>接入 RBAC 菜单权限</p>
              <p>收口 dashboard 趋势图和运营看板</p>
            </CardContent>
          </Card>
        </div>
    </PageLayout>
  )
}
