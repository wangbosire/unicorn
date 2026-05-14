import { AxiosError } from 'axios'
import { toast } from 'sonner'
import { ApiError } from './api-error'

export function handleServerError(error: unknown) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(error)
  }

  let errMsg = 'Something went wrong!'

  if (error instanceof ApiError) {
    errMsg = error.message
  }

  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    Number(error.status) === 204
  ) {
    errMsg = 'No content.'
  }

  if (error instanceof AxiosError) {
    const responseMessage = error.response?.data?.message
    if (typeof responseMessage === 'string' && responseMessage.length > 0) {
      errMsg = responseMessage
    }
  }

  toast.error(errMsg)
}
