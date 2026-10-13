import { api } from '@/services/api/client'

/**
 * Descarga un archivo de la API (necesita el token, así que no sirve un enlace
 * directo): lo pide como blob y dispara el guardado con el nombre que manda el
 * servidor en Content-Disposition.
 */
export async function downloadFromApi(url: string, params: Record<string, string | number | undefined>, fallbackName: string) {
  const response = await api.get(url, { params, responseType: 'blob' })
  const disposition = String(response.headers['content-disposition'] ?? '')
  const name = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)?.[1]

  const objectUrl = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = name ? decodeURIComponent(name) : fallbackName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}
