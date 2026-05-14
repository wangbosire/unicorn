import { createFileRoute } from '@tanstack/react-router'
import { CollectionListPage } from '@/features/collections/list-page'

export const Route = createFileRoute('/_authenticated/collections/list')({
  component: CollectionListPage,
})
