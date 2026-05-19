/**
 * 菜单权限组绑定保存请求。
 */
export type UpdateMenuPermissionGroupsRequest = {
  /** 本次绑定后的权限组主键列表。 */
  permissionGroupIds: string[]
  /** 本次变更说明；无则为 `null`。 */
  changeReason?: string | null
}
