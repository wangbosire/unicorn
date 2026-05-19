import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

type AdminReadOnlyNoticeProps = {
  title?: string
  description: string
}

/**
 * 后台权限不足时的统一只读提示。
 */
export function AdminReadOnlyNotice(props: AdminReadOnlyNoticeProps) {
  return (
    <Alert>
      <AlertTitle>{props.title ?? '当前为只读视图'}</AlertTitle>
      <AlertDescription>{props.description}</AlertDescription>
    </Alert>
  )
}

