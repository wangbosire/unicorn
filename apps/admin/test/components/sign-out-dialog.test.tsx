import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { SignOutDialog } from '@/components/sign-out-dialog'

/**
 * `vi.mock` 会被提升到模块顶部；在 `@vitest/browser` 下，工厂内引用的 `vi.fn()` 等
 * 必须通过 `vi.hoisted` 先创建，否则会触发模块 mock 解析失败。
 * @see https://vitest.dev/api/vi.html#vi-mock
 */
const m = vi.hoisted(() => ({
  navigate: vi.fn(),
  reset: vi.fn(),
  mockHref: 'https://app.test/dashboard?tab=1',
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    auth: { reset: m.reset },
  }),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => m.navigate,
    useLocation: () => ({ href: m.mockHref }),
  }
})

describe('SignOutDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls auth.reset and navigates to sign-in with current location as redirect', async () => {
    const { getByRole } = await render(
      <SignOutDialog open onOpenChange={vi.fn()} />
    )

    await userEvent.click(getByRole('button', { name: /^Sign out$/i }))

    expect(m.reset).toHaveBeenCalledOnce()
    expect(m.navigate).toHaveBeenCalledWith({
      to: '/sign-in',
      search: { redirect: m.mockHref },
      replace: true,
    })
  })

  it('does not call reset or navigate when Cancel is clicked', async () => {
    const { getByRole } = await render(
      <SignOutDialog open onOpenChange={vi.fn()} />
    )

    await userEvent.click(getByRole('button', { name: /^Cancel$/i }))

    expect(m.reset).not.toHaveBeenCalled()
    expect(m.navigate).not.toHaveBeenCalled()
  })
})
