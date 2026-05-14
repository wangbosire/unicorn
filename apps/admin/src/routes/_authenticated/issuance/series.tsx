import { createFileRoute } from '@tanstack/react-router'
import { SeriesPage } from '@/features/issuance/series-page'

export const Route = createFileRoute('/_authenticated/issuance/series')({
  component: SeriesPage,
})
