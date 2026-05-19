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
      title: '总览',
      items: [
        {
          title: '仪表盘',
          url: '/',
          icon: LayoutDashboard,
          anyOfPermissions: ['dashboard.read'],
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
          anyOfPermissions: ['issuance.series'],
        },
        {
          title: '发行批次',
          url: '/issuance/batches',
          icon: Tags,
          anyOfPermissions: ['issuance.batches'],
        },
        {
          title: '激活码管理',
          url: '/issuance/activation-codes',
          icon: KeyRound,
          anyOfPermissions: ['issuance.activation_codes'],
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
          anyOfPermissions: ['collection_reviews.manage'],
        },
        {
          title: '内容复核',
          url: '/collections/reviews',
          icon: ScanSearch,
          anyOfPermissions: ['collection_reviews.manage'],
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
          anyOfPermissions: ['collection_comments.manage'],
        },
        {
          title: '评论审核',
          url: '/comments/reviews',
          icon: ScrollText,
          anyOfPermissions: ['collection_comments.manage'],
        },
        {
          title: '会员管理',
          url: '/members',
          icon: Users,
          anyOfPermissions: ['members.read'],
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
          anyOfPermissions: ['transfers.read'],
        },
        {
          title: '通知中心',
          url: '/notifications',
          icon: Bell,
          anyOfPermissions: ['notifications.read'],
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
          anyOfPermissions: ['admin_users.read'],
        },
        {
          title: '角色权限',
          url: '/system/roles',
          icon: Shield,
          anyOfPermissions: ['roles.read'],
        },
        {
          title: '菜单权限',
          url: '/system/menus',
          icon: ScanSearch,
          anyOfPermissions: ['menus.read'],
        },
      ],
    },
  ],
}
