'use client'

import { useId, type ReactNode } from 'react'
import {
  useController,
  useFormContext,
  type ControllerFieldState,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
  type SubmitHandler,
  type UseControllerProps,
  type UseFormReturn,
} from 'react-hook-form'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Form } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

const proFormGridClassNames = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
} as const

type ProFormRenderContext<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = {
  field: ControllerRenderProps<TFieldValues, TName>
  fieldState: ControllerFieldState
  inputProps: {
    id: string
    'aria-describedby'?: string
    'aria-invalid': boolean
  }
}

export type ProFormProps<TFieldValues extends FieldValues> = Omit<
  React.ComponentProps<'form'>,
  'children' | 'onSubmit'
> & {
  /** `react-hook-form` 返回的 form 实例。 */
  form: UseFormReturn<TFieldValues>
  /** 表单提交处理函数。 */
  onSubmit: SubmitHandler<TFieldValues>
  /** 表单主体内容。 */
  children: ReactNode
  /** 是否渲染默认提交区，传 `false` 可完全自定义操作按钮。 */
  submitter?: ReactNode | false
}

/**
 * 后台 Pro 表单容器。
 * 统一接入 `react-hook-form` 上下文，避免业务页面重复书写 `FormProvider + form` 模板代码。
 */
export function ProForm<TFieldValues extends FieldValues>({
  form,
  onSubmit,
  submitter,
  className,
  children,
  ...props
}: ProFormProps<TFieldValues>) {
  return (
    <Form {...form}>
      <form
        noValidate
        className={cn('space-y-6', className)}
        onSubmit={form.handleSubmit(onSubmit)}
        {...props}
      >
        {children}
        {submitter === undefined ? <ProFormSubmitter /> : submitter}
      </form>
    </Form>
  )
}

export type ProFormGridProps = React.ComponentProps<'div'> & {
  /** 表单栅格列数，默认两列。 */
  columns?: keyof typeof proFormGridClassNames
}

/**
 * Pro 表单的基础栅格容器。
 * 适合后台资料编辑、设置页等双列或三列排版场景。
 */
export function ProFormGrid({
  columns = 2,
  className,
  ...props
}: ProFormGridProps) {
  return (
    <div
      className={cn('grid gap-4', proFormGridClassNames[columns], className)}
      {...props}
    />
  )
}

export type ProFormSectionProps = React.ComponentProps<'fieldset'> & {
  /** 分组标题。 */
  title?: ReactNode
  /** 分组说明。 */
  description?: ReactNode
  /** 分组内容区域样式。 */
  contentClassName?: string
}

/**
 * Pro 表单分组。
 * 与 shadcn 新版 `FieldSet/FieldLegend/FieldGroup` 对齐，用于承载一组相关字段。
 */
export function ProFormSection({
  title,
  description,
  contentClassName,
  className,
  children,
  ...props
}: ProFormSectionProps) {
  return (
    <FieldSet className={cn('gap-4', className)} {...props}>
      {title ? <FieldLegend variant='label'>{title}</FieldLegend> : null}
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldGroup className={contentClassName}>{children}</FieldGroup>
    </FieldSet>
  )
}

export type ProFormFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = UseControllerProps<TFieldValues, TName> & {
  /** 字段标签。 */
  label?: ReactNode
  /** 字段说明。 */
  description?: ReactNode
  /** 是否在标签旁显示必填星标。 */
  required?: boolean
  /** 字段布局方向。 */
  orientation?: 'vertical' | 'horizontal' | 'responsive'
  /** 外层字段容器样式。 */
  className?: string
  /** 字段内容区样式。 */
  contentClassName?: string
  /** 标签样式。 */
  labelClassName?: string
  /** 说明文案样式。 */
  descriptionClassName?: string
  /** 错误文案样式。 */
  messageClassName?: string
  /** 自定义字段渲染。 */
  render: (context: ProFormRenderContext<TFieldValues, TName>) => ReactNode
}

/**
 * Pro 表单字段基类。
 * 负责把 `react-hook-form` 的 fieldState、可访问性属性和 shadcn `Field` 样式统一串起来。
 */
export function ProFormField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  name,
  control,
  rules,
  disabled,
  shouldUnregister,
  defaultValue,
  label,
  description,
  required,
  orientation = 'vertical',
  className,
  contentClassName,
  labelClassName,
  descriptionClassName,
  messageClassName,
  render,
}: ProFormFieldProps<TFieldValues, TName>) {
  const fallbackId = useId()
  const form = useFormContext<TFieldValues>()
  const { field, fieldState } = useController<TFieldValues, TName>({
    name,
    control: control ?? form.control,
    rules,
    disabled,
    shouldUnregister,
    defaultValue,
  })

  const inputId = `pro-form-${String(name).replace(/\./g, '-')}-${fallbackId}`
  const descriptionId = `${inputId}-description`
  const messageId = `${inputId}-message`
  const describedBy = [
    description ? descriptionId : null,
    fieldState.error ? messageId : null,
  ]
    .filter(Boolean)
    .join(' ')

  const isRequired = required ?? hasRequiredRule(rules)

  return (
    <Field
      data-invalid={fieldState.invalid}
      data-disabled={field.disabled}
      orientation={orientation}
      className={className}
    >
      {label ? (
        <FieldLabel htmlFor={inputId} className={labelClassName}>
          {label}
          {isRequired ? (
            <span aria-hidden='true' className='text-destructive'>
              *
            </span>
          ) : null}
        </FieldLabel>
      ) : null}

      <FieldContent className={contentClassName}>
        {render({
          field,
          fieldState,
          inputProps: {
            id: inputId,
            'aria-describedby': describedBy || undefined,
            'aria-invalid': fieldState.invalid,
          },
        })}

        {description ? (
          <FieldDescription id={descriptionId} className={descriptionClassName}>
            {description}
          </FieldDescription>
        ) : null}

        <FieldError
          id={messageId}
          className={messageClassName}
          errors={[fieldState.error]}
        />
      </FieldContent>
    </Field>
  )
}

export type ProFormTextProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = Omit<ProFormFieldProps<TFieldValues, TName>, 'render' | 'className'> &
  Omit<
    React.ComponentProps<typeof Input>,
    'name' | 'value' | 'defaultValue' | 'onChange' | 'onBlur'
  > & {
    /** 字段容器样式。 */
    fieldClassName?: string
  }

/**
 * Pro 单行文本字段。
 */
export function ProFormText<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  fieldClassName,
  className,
  ...props
}: ProFormTextProps<TFieldValues, TName>) {
  const {
    name,
    control,
    rules,
    disabled,
    shouldUnregister,
    defaultValue,
    label,
    description,
    required,
    orientation,
    contentClassName,
    labelClassName,
    descriptionClassName,
    messageClassName,
    ...controlProps
  } = props

  return (
    <ProFormField
      name={name}
      control={control}
      rules={rules}
      disabled={disabled}
      shouldUnregister={shouldUnregister}
      defaultValue={defaultValue}
      label={label}
      description={description}
      required={required}
      orientation={orientation}
      className={fieldClassName}
      contentClassName={contentClassName}
      labelClassName={labelClassName}
      descriptionClassName={descriptionClassName}
      messageClassName={messageClassName}
      render={({ field, inputProps }) => (
        <Input
          {...field}
          {...controlProps}
          {...inputProps}
          value={field.value ?? ''}
          className={className}
        />
      )}
    />
  )
}

export type ProFormTextAreaProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = Omit<ProFormFieldProps<TFieldValues, TName>, 'render' | 'className'> &
  Omit<
    React.ComponentProps<typeof Textarea>,
    'name' | 'value' | 'defaultValue' | 'onChange' | 'onBlur'
  > & {
    /** 字段容器样式。 */
    fieldClassName?: string
  }

/**
 * Pro 多行文本字段。
 */
export function ProFormTextArea<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  fieldClassName,
  className,
  ...props
}: ProFormTextAreaProps<TFieldValues, TName>) {
  const {
    name,
    control,
    rules,
    disabled,
    shouldUnregister,
    defaultValue,
    label,
    description,
    required,
    orientation,
    contentClassName,
    labelClassName,
    descriptionClassName,
    messageClassName,
    ...controlProps
  } = props

  return (
    <ProFormField
      name={name}
      control={control}
      rules={rules}
      disabled={disabled}
      shouldUnregister={shouldUnregister}
      defaultValue={defaultValue}
      label={label}
      description={description}
      required={required}
      orientation={orientation}
      className={fieldClassName}
      contentClassName={contentClassName}
      labelClassName={labelClassName}
      descriptionClassName={descriptionClassName}
      messageClassName={messageClassName}
      render={({ field, inputProps }) => (
        <Textarea
          {...field}
          {...controlProps}
          {...inputProps}
          value={field.value ?? ''}
          className={className}
        />
      )}
    />
  )
}

export type ProFormSelectOption = {
  /** 选项显示文案。 */
  label: ReactNode
  /** 选项提交值。 */
  value: string
  /** 是否禁用该选项。 */
  disabled?: boolean
}

export type ProFormSelectProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = Omit<ProFormFieldProps<TFieldValues, TName>, 'render' | 'className'> & {
  /** 下拉选项列表。 */
  options: ProFormSelectOption[]
  /** 占位提示。 */
  placeholder?: string
  /** 下拉触发器样式。 */
  triggerClassName?: string
  /** 字段容器样式。 */
  fieldClassName?: string
}

/**
 * Pro 下拉选择字段。
 */
export function ProFormSelect<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  fieldClassName,
  options,
  placeholder,
  triggerClassName,
  ...fieldProps
}: ProFormSelectProps<TFieldValues, TName>) {
  const {
    name,
    control,
    rules,
    disabled,
    shouldUnregister,
    defaultValue,
    label,
    description,
    required,
    orientation,
    contentClassName,
    labelClassName,
    descriptionClassName,
    messageClassName,
  } = fieldProps

  return (
    <ProFormField
      name={name}
      control={control}
      rules={rules}
      disabled={disabled}
      shouldUnregister={shouldUnregister}
      defaultValue={defaultValue}
      label={label}
      description={description}
      required={required}
      orientation={orientation}
      className={fieldClassName}
      contentClassName={contentClassName}
      labelClassName={labelClassName}
      descriptionClassName={descriptionClassName}
      messageClassName={messageClassName}
      render={({ field, inputProps }) => (
        <Select
          value={field.value ?? ''}
          disabled={field.disabled}
          onValueChange={field.onChange}
        >
          <SelectTrigger
            {...inputProps}
            className={cn('w-full', triggerClassName)}
          >
            <SelectValue placeholder={placeholder ?? '请选择'} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  )
}

export type ProFormSwitchProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = Omit<ProFormFieldProps<TFieldValues, TName>, 'render' | 'className'> &
  Omit<
    React.ComponentProps<typeof Switch>,
    'checked' | 'defaultChecked' | 'onCheckedChange'
  > & {
    /** 字段容器样式。 */
    fieldClassName?: string
  }

/**
 * Pro 开关字段。
 */
export function ProFormSwitch<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  fieldClassName,
  className,
  orientation = 'horizontal',
  ...props
}: ProFormSwitchProps<TFieldValues, TName>) {
  const {
    name,
    control,
    rules,
    disabled,
    shouldUnregister,
    defaultValue,
    label,
    description,
    required,
    contentClassName,
    labelClassName,
    descriptionClassName,
    messageClassName,
    ...switchProps
  } = props

  return (
    <ProFormField
      name={name}
      control={control}
      rules={rules}
      disabled={disabled}
      shouldUnregister={shouldUnregister}
      defaultValue={defaultValue}
      label={label}
      description={description}
      required={required}
      orientation={orientation}
      className={fieldClassName}
      contentClassName={contentClassName}
      labelClassName={labelClassName}
      descriptionClassName={descriptionClassName}
      messageClassName={messageClassName}
      render={({ field, inputProps }) => (
        <Switch
          {...inputProps}
          {...switchProps}
          checked={Boolean(field.value)}
          disabled={field.disabled}
          onCheckedChange={field.onChange}
          className={className}
        />
      )}
    />
  )
}

export type ProFormSubmitterProps = React.ComponentProps<'div'> & {
  /** 提交按钮文案。 */
  submitText?: ReactNode
  /** 重置按钮文案。 */
  resetText?: ReactNode
  /** 是否隐藏重置按钮。 */
  hideReset?: boolean
  /** 自定义重置行为。 */
  onReset?: () => void
}

/**
 * Pro 表单默认操作区。
 * 默认行为与 shadcn 示例保持一致，提交依赖 `handleSubmit`，重置走 `form.reset()`。
 */
export function ProFormSubmitter({
  submitText = '保存',
  resetText = '重置',
  hideReset = false,
  onReset,
  className,
  ...props
}: ProFormSubmitterProps) {
  const form = useFormContext()

  return (
    <div
      className={cn('flex flex-wrap items-center justify-end gap-3', className)}
      {...props}
    >
      {!hideReset ? (
        <Button
          type='button'
          variant='outline'
          onClick={() => {
            onReset?.()
            if (!onReset) {
              form.reset()
            }
          }}
        >
          {resetText}
        </Button>
      ) : null}
      <Button type='submit' disabled={form.formState.isSubmitting}>
        {submitText}
      </Button>
    </div>
  )
}

function hasRequiredRule<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>(rules?: UseControllerProps<TFieldValues, TName>['rules']): boolean {
  if (!rules?.required) {
    return false
  }

  return true
}
