import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import {
  ProForm,
  ProFormSelect,
  ProFormSubmitter,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
} from '@/components/pro'

const formSchema = z.object({
  name: z.string().min(1, '请输入名称'),
  role: z.string().min(1, '请选择角色'),
  description: z.string().min(5, '请输入至少 5 个字符'),
  enabled: z.boolean(),
})

type DemoFormValues = z.infer<typeof formSchema>

function DemoProForm({
  onSubmit = vi.fn(),
}: {
  onSubmit?: (values: DemoFormValues) => void
}) {
  const form = useForm<DemoFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      role: '',
      description: '',
      enabled: false,
    },
  })

  return (
    <ProForm form={form} onSubmit={onSubmit} submitter={false}>
      <ProFormText
        name='name'
        label='名称'
        required
        placeholder='请输入名称'
      />
      <ProFormSelect
        name='role'
        label='角色'
        required
        placeholder='请选择角色'
        options={[
          { label: '管理员', value: 'admin' },
          { label: '运营', value: 'operator' },
        ]}
      />
      <ProFormTextArea
        name='description'
        label='描述'
        placeholder='请输入描述'
      />
      <ProFormSwitch
        name='enabled'
        label='启用状态'
        description='启用后该配置会立即生效。'
      />
      <ProFormSubmitter submitText='提交' resetText='清空' />
    </ProForm>
  )
}

describe('ProForm', () => {
  it('shows validation errors and resets form values', async () => {
    const { getByRole, getByText } = await render(<DemoProForm />)

    await userEvent.click(getByRole('button', { name: '提交' }))

    await expect.element(getByText('请输入名称')).toBeInTheDocument()
    await expect.element(getByText('请选择角色')).toBeInTheDocument()
    await expect.element(getByText('请输入至少 5 个字符')).toBeInTheDocument()

    const nameInput = getByRole('textbox', { name: '名称' })
    await userEvent.fill(nameInput, '平台管理员')
    await expect.element(nameInput).toHaveValue('平台管理员')

    await userEvent.click(getByRole('button', { name: '清空' }))
    await expect.element(nameInput).toHaveValue('')
  })

  it('submits composed field values', async () => {
    const onSubmit = vi.fn()
    const { getByRole } = await render(<DemoProForm onSubmit={onSubmit} />)

    await userEvent.fill(getByRole('textbox', { name: '名称' }), '审核配置')

    const roleSelect = getByRole('combobox', { name: '角色' })
    await userEvent.click(roleSelect)
    await userEvent.click(getByRole('option', { name: '管理员' }))

    await userEvent.fill(getByRole('textbox', { name: '描述' }), '用于审核流转')
    await userEvent.click(getByRole('switch', { name: '启用状态' }))

    await userEvent.click(getByRole('button', { name: '提交' }))

    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onSubmit).toHaveBeenCalledWith({
      name: '审核配置',
      role: 'admin',
      description: '用于审核流转',
      enabled: true,
    })
  })
})
