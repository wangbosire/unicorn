import {
  Bell,
  Blocks,
  BookOpenText,
  Boxes,
  FolderKanban,
  KeyRound,
  LayoutDashboard,
  MessageSquareMore,
  ScanSearch,
  ScrollText,
  Shield,
  SquareTerminal,
  Tags,
  Users,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Unicorn Admin',
    email: 'ops@unicorn.local',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'Unicorn Platform',
      logo: Blocks,
      plan: 'Digital Collection',
    },
  ],
  navGroups: [
    {
      title: 'Overview',
      items: [
        {
          title: '仪表盘',
          url: '/',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: '发行管理',
      items: [
        {
          title: '系列管理',
          url: '/issuance/series',
          icon: FolderKanban,
        },
        {
          title: '发行批次',
          url: '/issuance/batches',
          icon: Tags,
        },
        {
          title: '激活码管理',
          url: '/issuance/activation-codes',
          icon: KeyRound,
        },
      ],
    },
    {
      title: '藏品业务',
      items: [
        {
          title: '藏品列表',
          url: '/collections/list',
          icon: Boxes,
        },
        {
          title: '内容复核',
          url: '/collections/reviews',
          icon: ScanSearch,
        },
      ],
    },
    {
      title: '互动与会员',
      items: [
        {
          title: '评论列表',
          url: '/comments/list',
          icon: MessageSquareMore,
        },
        {
          title: '评论审核',
          url: '/comments/reviews',
          icon: ScrollText,
        },
        {
          title: '会员管理',
          url: '/members',
          icon: Users,
        },
      ],
    },
    {
      title: '转让与通知',
      items: [
        {
          title: '转让记录',
          url: '/transfers',
          icon: BookOpenText,
        },
        {
          title: '通知中心',
          url: '/notifications',
          icon: Bell,
        },
      ],
    },
    {
      title: '系统管理',
      items: [
        {
          title: '后台用户',
          url: '/system/admin-users',
          icon: SquareTerminal,
        },
        {
          title: '角色权限',
          url: '/system/roles',
          icon: Shield,
        },
      ],
    },
  ],
}
