import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { type Locator, userEvent } from 'vitest/browser'
import { UserAuthForm } from '@/features/auth/sign-in/components/user-auth-form'

/** 供 vi.mock 工厂引用；避免与 mock 提升顺序冲突（browser 模式会严格校验）。 */
const m = vi.hoisted(() => ({
  navigate: vi.fn(),
  setUserMock: vi.fn(),
  setAccessTokenMock: vi.fn(),
  loginAdminMock: vi.fn(),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    auth: {
      setUser: m.setUserMock,
      setAccessToken: m.setAccessTokenMock,
    },
  }),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => m.navigate,
    Link: ({
      children,
      to,
      className,
      ...rest
    }: {
      children?: React.ReactNode
      to: string
      className?: string
    }) => (
      <a href={to} className={className} {...rest}>
        {children}
      </a>
    ),
  }
})

vi.mock('@/apis/admin-auth', () => ({
  loginAdmin: m.loginAdminMock,
}))

describe('UserAuthForm', () => {
  describe('Rendering without redirectTo', () => {
    let screen: RenderResult
    let usernameInput: Locator
    let passwordInput: Locator
    let signInButton: Locator
    let forgotPasswordLink: Locator

    beforeEach(async () => {
      vi.clearAllMocks()
      m.loginAdminMock.mockResolvedValue({
        accessToken: 'jwt-test-token',
        user: {
          id: 'admin_1',
          accountNo: 'ADM000001',
          username: 'admin',
          displayName: '管理员',
          roles: ['super_admin'],
          permissionKeys: ['*'],
        },
      })
      screen = await render(<UserAuthForm />)
      usernameInput = screen.getByRole('textbox', { name: /^用户名$/ })
      passwordInput = screen.getByLabelText(/^密码$/i)
      signInButton = screen.getByRole('button', { name: /^登录$/ })
      forgotPasswordLink = screen.getByText(/^忘记密码？$/i)
    })

    it('renders fields, submit button, and forgot password link', async () => {
      await expect.element(usernameInput).toBeInTheDocument()
      await expect.element(passwordInput).toBeInTheDocument()
      await expect.element(signInButton).toBeInTheDocument()
      await expect.element(forgotPasswordLink).toBeInTheDocument()
    })

    it('shows validation messages when submitting empty form', async () => {
      await userEvent.click(signInButton)

      await expect
        .element(screen.getByText('请输入登录用户名'))
        .toBeInTheDocument()
      await expect.element(screen.getByText('请输入密码')).toBeInTheDocument()
    })

    it('authenticates and navigates to default route on success', async () => {
      await userEvent.fill(usernameInput, 'admin')
      await userEvent.fill(passwordInput, 'Admin123!')

      await userEvent.click(signInButton)

      await vi.waitFor(() => expect(m.loginAdminMock).toHaveBeenCalledOnce())
      expect(m.loginAdminMock).toHaveBeenCalledWith({
        username: 'admin',
        password: 'Admin123!',
      })

      await vi.waitFor(() => expect(m.setUserMock).toHaveBeenCalledOnce())
      expect(m.setUserMock).toHaveBeenCalledWith({
        id: 'admin_1',
        accountNo: 'ADM000001',
        username: 'admin',
        displayName: '管理员',
        roles: ['super_admin'],
        permissionKeys: ['*'],
      })
      expect(m.setAccessTokenMock).toHaveBeenCalledWith('jwt-test-token')

      await vi.waitFor(() =>
        expect(m.navigate).toHaveBeenCalledWith({ to: '/', replace: true })
      )
    })
  })

  it('navigates to redirectTo when provided', async () => {
    vi.clearAllMocks()
    m.loginAdminMock.mockResolvedValue({
      accessToken: 'jwt-test-token',
      user: {
        id: 'admin_1',
        accountNo: 'ADM000001',
        username: 'admin',
        displayName: '管理员',
        roles: ['super_admin'],
        permissionKeys: ['*'],
      },
    })

    const { getByRole, getByLabelText } = await render(
      <UserAuthForm redirectTo='/settings' />
    )

    await userEvent.fill(getByRole('textbox', { name: /用户名/i }), 'admin')
    await userEvent.fill(getByLabelText('密码'), 'Admin123!')

    await userEvent.click(getByRole('button', { name: /登录/i }))

    await vi.waitFor(() => expect(m.setUserMock).toHaveBeenCalledOnce())
    expect(m.setAccessTokenMock).toHaveBeenCalledOnce()

    await vi.waitFor(() =>
      expect(m.navigate).toHaveBeenCalledWith({
        to: '/settings',
        replace: true,
      })
    )
  })
})
