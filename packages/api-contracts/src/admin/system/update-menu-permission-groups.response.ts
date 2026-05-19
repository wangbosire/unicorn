/**
 * 菜单权限组绑定保存响应。
 */
export type UpdateMenuPermissionGroupsResponseData = {
  /** 菜单主键。 */
  menuId: string
  /** 稳定菜单 key。 */
  menuKey: string
  /** 生效的权限组主键列表。 */
  permissionGroupIds: string[]
  /** 生效的权限组 key 列表。 */
  permissionGroupKeys: string[]
  /** 更新时间（毫秒时间戳）。 */
  updatedAt: number
}
