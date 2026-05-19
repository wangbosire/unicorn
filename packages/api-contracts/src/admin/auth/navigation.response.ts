/**
 * 当前登录后台用户可见的导航菜单项。
 */
export type AdminNavigationMenuItem = {
  /** 菜单主键。 */
  menuId: string
  /** 父菜单主键；根节点为 `null`。 */
  parentId: string | null
  /** 稳定菜单 key。 */
  menuKey: string
  /** 菜单名称。 */
  menuName: string
  /** 菜单类型。 */
  menuType: string
  /** 路由路径或外链地址；无则为 `null`。 */
  routePath: string | null
  /** 图标标识；无则为 `null`。 */
  iconName: string | null
  /** 排序值。 */
  sortOrder: number
}

/**
 * 当前登录后台用户的导航视图。
 */
export type AdminGetNavigationResponseData = {
  /** 当前账号可见的菜单节点列表，包含展示所需的祖先目录。 */
  menus: AdminNavigationMenuItem[]
  /** 导航配置告警列表。 */
  warnings: string[]
}
