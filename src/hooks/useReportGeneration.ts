import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { reportsApi } from '@/services/api/reports'

const POLL_INTERVAL_MS = 1500
const MAX_POLLS = 40 // ~60s — after this we assume the queue worker is stuck/down

/**
 * Drives the create → poll → download flow shared by every report card on
 * /reports: the backend generates each report in a queued Job, so this hook
 * polls GET /reports/{id} until it leaves pending/processing, then triggers
 * a real file download via a temporary <a download> (voiceNotes.ts's
 * objectUrl pattern, but forcing a save instead of inline playback).
 */
export function useReportGeneration() {
  const [isGenerating, setIsGenerating] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const generate = async (create: () => Promise<{ id: number }>, filename: string) => {
    setIsGenerating(true)
    try {
      const { id } = await create()

      let status: 'pending' | 'processing' | 'completed' | 'failed' = 'pending'
      let errorMessage: string | null = null
      let format: 'excel' | 'pdf' = 'excel'
      let polls = 0

      while (status === 'pending' || status === 'processing') {
        if (!mountedRef.current) return
        if (polls >= MAX_POLLS) {
          toast.error('El reporte está tardando más de lo esperado. Intenta de nuevo en unos minutos.')
          return
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
        if (!mountedRef.current) return
        const report = await reportsApi.status(id)
        status = report.status
        errorMessage = report.error_message
        format = report.format
        polls += 1
      }

      if (!mountedRef.current) return

      if (status === 'failed') {
        toast.error(errorMessage ?? 'No pudimos generar el reporte.')
        return
      }

      const blob = await reportsApi.downloadBlob(id)
      if (!mountedRef.current) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${filename}.${format === 'excel' ? 'xlsx' : 'pdf'}`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Reporte generado.')
    } catch {
      if (mountedRef.current) {
        toast.error('No pudimos generar el reporte.')
      }
    } finally {
      if (mountedRef.current) {
        setIsGenerating(false)
      }
    }
  }

  return { generate, isGenerating }
}
