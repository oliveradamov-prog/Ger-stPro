'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import RequireAuth from '@/components/RequireAuth'

const PHOTOS_BUCKET = process.env.NEXT_PUBLIC_PHOTOS_BUCKET || 'DAILY-LOG-PHOTOS'
const PHOTOS_TABLE = 'daily_log_photos'

type DailyLog = {
  id: string
  project_id: string
  user_id: string
  log_date: string
  description: string | null
  work_description: string | null
  remarks: string | null
  external_company: string | null
  created_at: string
  workers_count?: number | null
  site_managers_count?: number | null
  workers_names?: string[] | null
  site_managers_names?: string[] | null
}

type Project = {
  id: string
  name: string
  location: string | null
  client: string | null
  logo_url?: string | null
}

type Profile = {
  full_name: string | null
  logo_url: string | null
}

type PhotoRow = {
  log_id: string
  path: string
  created_at?: string
}

type WorkerRow = {
  id: string
  log_id: string
  company: string | null
  name: string
  hours: number | null
  time_range: string | null
}

type MeetingRow = {
  id: string
  log_id: string
  thema: string | null
  termin: string | null
}

type EventRow = {
  id: string
  log_id: string
  text: string | null
  erlediger: string | null
  status: string | null
  termin: string | null
}

function formatDateLong(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  })
}

function formatDateTime(dateStr?: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('de-DE')
}

function asText(v: unknown) {
  if (v == null) return ''
  if (Array.isArray(v)) return v.join(', ')
  return String(v)
}

function formatHours(v: number | null) {
  if (v == null) return '—'
  const s = String(v).replace('.', ',')
  return s
}
function safeFileName(value: string) {
  return String(value || 'tagesbericht')
    .replace(/[^\w.\-]+/g, '_')
    .replace(/_+/g, '_')
}
function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function imageUrlToDataUrl(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Bild konnte nicht geladen werden.')
  const blob = await res.blob()
  return blobToDataUrl(blob)
}

export default function LogDetailsPage() {
  const params = useParams()
  const router = useRouter()

  const projectId = useMemo(() => {
    const raw = (params as any)?.projectId
    return typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : ''
  }, [params])

  const logId = useMemo(() => {
    const raw = (params as any)?.logId
    return typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : ''
  }, [params])

  const [project, setProject] = useState<Project | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [log, setLog] = useState<DailyLog | null>(null)
  const [workers, setWorkers] = useState<WorkerRow[]>([])
  const [meetings, setMeetings] = useState<MeetingRow[]>([])
  const [events, setEvents] = useState<EventRow[]>([])

  const [photos, setPhotos] = useState<PhotoRow[]>([])
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})

  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [pdfBusy, setPdfBusy] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setMsg('')
      setLoading(true)

      if (!projectId || !logId) {
        setLoading(false)
        return
      }


      try {
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('id, name, location, client, logo_url')
          .eq('id', projectId)
          .single()

        if (projectError) throw projectError

        const { data: logData, error: logError } = await supabase
          .from('daily_logs')
          .select(
            'id, project_id, user_id, log_date, description, work_description, remarks, external_company, created_at, workers_count, site_managers_count, workers_names, site_managers_names'
          )
          .eq('id', logId)
          .eq('project_id', projectId)
          .single()

        if (logError) throw logError

        const [
          profileRes,
          workersRes,
          meetingsRes,
          eventsRes,
          photosRes,
        ] = await Promise.all([
          supabase
            .from('profiles')
            .select('full_name, logo_url')
            .eq('id', logData.user_id)
            .maybeSingle(),
          supabase
            .from('daily_log_workers')
            .select('id, log_id, company, name, hours, time_range')
            .eq('log_id', logId)
            .order('sort_order', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: true }),
          supabase
            .from('daily_log_meetings')
            .select('id, log_id, thema, termin')
            .eq('log_id', logId)
            .order('created_at', { ascending: true }),
          supabase
            .from('daily_log_events')
            .select('id, log_id, text, erlediger, status, termin')
            .eq('log_id', logId)
            .order('created_at', { ascending: true }),
          supabase
            .from(PHOTOS_TABLE)
            .select('log_id, path, created_at')
            .eq('log_id', logId)
            .order('created_at', { ascending: false }),
        ])

        if (workersRes.error) throw workersRes.error
        if (meetingsRes.error) throw meetingsRes.error
        if (eventsRes.error) throw eventsRes.error
        if (photosRes.error) console.warn(photosRes.error.message)

        if (!cancelled) {
          setProject(projectData as Project)
          setProfile((profileRes.data as Profile | null) ?? null)
          setLog(logData as DailyLog)
          setWorkers((workersRes.data as WorkerRow[]) ?? [])
          setMeetings((meetingsRes.data as MeetingRow[]) ?? [])
          setEvents((eventsRes.data as EventRow[]) ?? [])
          setPhotos((photosRes.data as PhotoRow[]) ?? [])
        }
      } catch (e: any) {
        if (!cancelled) setMsg(e?.message ?? 'Etwas ist schiefgelaufen.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [projectId, logId])

  useEffect(() => {
    let cancelled = false

    async function buildSignedUrls() {
      if (!photos.length) {
        setPhotoUrls({})
        return
      }

      try {
        const entries = await Promise.all(
          photos.map(async (p) => {
            const { data, error } = await supabase.storage
              .from(PHOTOS_BUCKET)
              .createSignedUrl(p.path, 60 * 60)

            if (error || !data?.signedUrl) return [p.path, ''] as const
            return [p.path, data.signedUrl] as const
          })
        )

        if (!cancelled) {
          setPhotoUrls(Object.fromEntries(entries.filter(([, u]) => !!u)))
        }
      } catch {
        if (!cancelled) setPhotoUrls({})
      }
    }

    buildSignedUrls()
    return () => {
      cancelled = true
    }
  }, [photos])
  
  async function exportPdf() {
    try {
      setMsg('')
      setPdfBusy(true)

      const { jsPDF } = await import('jspdf')

      const pdf = new jsPDF('p', 'pt', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()

      const margin = 36
      const contentWidth = pageWidth - margin * 2
      let y = margin

      const ensureSpace = (needed: number) => {
        if (y + needed > pageHeight - margin) {
          pdf.addPage()
          y = margin
        }
      }

      const addSectionTitle = (title: string) => {
        ensureSpace(24)
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(14)
        pdf.setTextColor(25, 25, 25)
        pdf.text(title, margin, y)
        y += 18
      }
      
      const drawSectionBox = (
        title: string,
        boxHeight: number,
        renderContent: (startY: number) => void
      ) => {
        const radius = 10
        const paddingX = 14
        const paddingTop = 14
        const titleGap = 18

        if (y + boxHeight > pageHeight - margin) {
          pdf.addPage()
          y = margin
        }

        pdf.setDrawColor(225, 225, 225)
        pdf.roundedRect(margin, y, contentWidth, boxHeight, radius, radius)

        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(11)
        pdf.setTextColor(70, 70, 70)
        pdf.text(title, margin + paddingX, y + paddingTop)

        const contentStartY = y + paddingTop + titleGap
        renderContent(contentStartY)

        y += boxHeight + 10
      }

      const addTextBlock = (label: string, value: string) => {
        const paddingX = 14
        const paddingTop = 14
        const paddingBottom = 12
        const titleGap = 18
        const lineHeight = 16

        const textWidth = contentWidth - paddingX * 2
        const lines = pdf.splitTextToSize(value || '—', textWidth)

        let remainingLines = [...lines]
        let firstPage = true

        while (remainingLines.length > 0) {
          const currentTitle = firstPage ? label : `${label} (Fortsetzung)`

          const usableHeight =
            pageHeight - margin - y - paddingTop - titleGap - paddingBottom

          const maxLinesThisPage = Math.max(1, Math.floor(usableHeight / lineHeight))
          const linesForThisPage = remainingLines.slice(0, maxLinesThisPage)
          remainingLines = remainingLines.slice(maxLinesThisPage)

          const boxHeight =
            paddingTop + titleGap + linesForThisPage.length * lineHeight + paddingBottom

          drawSectionBox(currentTitle, boxHeight, (contentStartY) => {
            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(12)
            pdf.setTextColor(20, 20, 20)

            let textY = contentStartY
            for (const line of linesForThisPage) {
              pdf.text(line, margin + paddingX, textY)
              textY += lineHeight
            }
          })

          firstPage = false
        }

        if (lines.length === 0) {
          const boxHeight = paddingTop + titleGap + lineHeight + paddingBottom

          drawSectionBox(label, boxHeight, (contentStartY) => {
            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(12)
            pdf.setTextColor(20, 20, 20)
            pdf.text('—', margin + paddingX, contentStartY)
          })
        }
      }


      const getTableColWidth = (headers: string[]) => contentWidth / headers.length

      const getPreparedHeaderLines = (headers: string[], colWidth: number) =>
        headers.map((h) => pdf.splitTextToSize(h, colWidth - 12))

      const getTableHeaderHeight = (headers: string[], colWidth: number) => {
        const preparedHeaders = getPreparedHeaderLines(headers, colWidth)
        const maxLines = Math.max(...preparedHeaders.map((x: string[]) => x.length), 1)
        return Math.max(24, maxLines * 12 + 8)
      }

      const getPreparedRowLines = (row: string[], colWidth: number) =>
        row.map((cell) => pdf.splitTextToSize(cell || '—', colWidth - 12))

      const getTableRowHeight = (row: string[], colWidth: number) => {
        const prepared = getPreparedRowLines(row, colWidth)
        const maxLines = Math.max(...prepared.map((x: string[]) => x.length), 1)
        return Math.max(24, maxLines * 12 + 10)
      }

      const drawTableHeaderAt = (
        headers: string[],
        colWidth: number,
        startX: number,
        startY: number,
        tableWidth: number
      ) => {
        const preparedHeaders = getPreparedHeaderLines(headers, colWidth)
        const headerHeight = getTableHeaderHeight(headers, colWidth)

        pdf.setFillColor(245, 245, 245)
        pdf.roundedRect(startX, startY, tableWidth, headerHeight, 8, 8, 'F')

        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(10)
        pdf.setTextColor(60, 60, 60)

        preparedHeaders.forEach((lines: string[], i) => {
          pdf.text(lines, startX + i * colWidth + 6, startY + 15)
        })

        return headerHeight
      }

      const drawTableRowAt = (
        row: string[],
        colWidth: number,
        startX: number,
        startY: number
      ) => {
        const prepared = getPreparedRowLines(row, colWidth)
        const rowHeight = getTableRowHeight(row, colWidth)

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(10)
        pdf.setTextColor(20, 20, 20)

        prepared.forEach((cellLines: string[], i) => {
          pdf.text(cellLines, startX + i * colWidth + 6, startY + 15)
        })

        return rowHeight
      }

      const addSmallTableBox = (
        sectionTitle: string,
        headers: string[],
        rows: string[][]
      ) => {
        const paddingX = 14
        const paddingTop = 14
        const paddingBottom = 12
        const titleGap = 18

        const tableWidth = contentWidth - paddingX * 2
        const colWidth = tableWidth / headers.length
        const headerHeight = getTableHeaderHeight(headers, colWidth)

        const rowsHeight =
          rows.length === 0
            ? 30
            : rows.reduce((sum, row) => sum + getTableRowHeight(row, colWidth), 0)

        const boxHeight = paddingTop + titleGap + headerHeight + rowsHeight + paddingBottom

        drawSectionBox(sectionTitle, boxHeight, (contentStartY) => {
          const startX = margin + paddingX
          let innerY = contentStartY

          const drawnHeaderHeight = drawTableHeaderAt(
            headers,
            colWidth,
            startX,
            innerY,
            tableWidth
          )

          innerY += drawnHeaderHeight

          if (rows.length === 0) {
            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(10)
            pdf.setTextColor(20, 20, 20)
            pdf.text('Keine Daten vorhanden.', startX, innerY + 15)
            return
          }

          rows.forEach((row) => {
            const rowHeight = drawTableRowAt(row, colWidth, startX, innerY)
            innerY += rowHeight
          })
        })
      }

      const addPaginatedWorkersTable = (
        sectionTitle: string,
        headers: string[],
        rows: string[][]
      ) => {
        const paddingX = 14
        const paddingTop = 14
        const paddingBottom = 12
        const titleGap = 18

        const tableWidth = contentWidth - paddingX * 2
        const colWidth = tableWidth / headers.length
        const headerHeight = getTableHeaderHeight(headers, colWidth)

        if (rows.length === 0) {
          addSmallTableBox(sectionTitle, headers, [])
          return
        }

        let remainingRows = [...rows]
        let firstPage = true

        while (remainingRows.length > 0) {
          let availableRowsHeight =
            pageHeight - margin - y - paddingTop - titleGap - headerHeight - paddingBottom

          // Ha a mostani oldalon már túl kevés hely maradt,
          // ne rakjunk ki csak 1 sort külön dobozba,
          // hanem kezdjünk inkább új oldalt.
          const minRowsWanted = Math.min(3, remainingRows.length)
          const minUsefulHeight = remainingRows
            .slice(0, minRowsWanted)
            .reduce((sum, row) => sum + getTableRowHeight(row, colWidth), 0)

          if (availableRowsHeight < minUsefulHeight && y > margin + 20) {
            pdf.addPage()
            y = margin
            availableRowsHeight =
              pageHeight - margin - y - paddingTop - titleGap - headerHeight - paddingBottom
          }

          let consumedHeight = 0
          let rowsForThisPage: string[][] = []

          for (const row of remainingRows) {
            const rowHeight = getTableRowHeight(row, colWidth)

            if (rowsForThisPage.length > 0 && consumedHeight + rowHeight > availableRowsHeight) {
              break
            }

            rowsForThisPage.push(row)
            consumedHeight += rowHeight
          }

          if (rowsForThisPage.length === 0) {
            pdf.addPage()
            y = margin
            continue
          }

          const boxHeight = paddingTop + titleGap + headerHeight + consumedHeight + paddingBottom
          const titleText = firstPage ? sectionTitle : `${sectionTitle} (Fortsetzung)`

          drawSectionBox(titleText, boxHeight, (contentStartY) => {
            const startX = margin + paddingX
            let innerY = contentStartY

            const drawnHeaderHeight = drawTableHeaderAt(
              headers,
              colWidth,
              startX,
              innerY,
              tableWidth
            )

            innerY += drawnHeaderHeight

            rowsForThisPage.forEach((row) => {
              const rowHeight = drawTableRowAt(row, colWidth, startX, innerY)
              innerY += rowHeight
            })
          })

          remainingRows = remainingRows.slice(rowsForThisPage.length)
          firstPage = false
        }
      }
      const title = log?.description?.trim() ? log.description : 'Tagesbericht'
      const projectName = project?.name ?? 'Projekt'

      const headerTop = margin
      const logoBoxWidth = 84
      const logoBoxHeight = 52
      const logoX = pageWidth - margin - logoBoxWidth
      const logoY = headerTop

      if (effectiveLogoUrl) {
        try {
          const logoImg = new Image()
          logoImg.src = effectiveLogoUrl

          await new Promise<void>((resolve) => {
            logoImg.onload = () => resolve()
            logoImg.onerror = () => resolve()
          })

          const naturalWidth = logoImg.naturalWidth || 1
          const naturalHeight = logoImg.naturalHeight || 1

          const scale = Math.min(
            logoBoxWidth / naturalWidth,
            logoBoxHeight / naturalHeight
          )

          const renderWidth = naturalWidth * scale
          const renderHeight = naturalHeight * scale

          const drawX = logoX + (logoBoxWidth - renderWidth) / 2
          const drawY = logoY + (logoBoxHeight - renderHeight) / 2

          pdf.addImage(effectiveLogoUrl, 'PNG', drawX, drawY, renderWidth, renderHeight)

          const logoDataUrl = await imageUrlToDataUrl(effectiveLogoUrl)

          pdf.addImage(
            effectiveLogoUrl,
            'PNG',
            drawX,
            drawY,
            renderWidth,
            renderHeight
          )
        } catch {}
      }

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(22)
      pdf.setTextColor(20, 20, 20)
      pdf.text(title, margin, headerTop + 18)

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(11)
      pdf.setTextColor(90, 90, 90)
      pdf.text(`${formatDateLong(log?.log_date || '')} • ${projectName}`, margin, headerTop + 38)

      y = headerTop + 74

      const addMetaBox = () => {
        const paddingX = 14
        const paddingTop = 14
        const paddingBottom = 12
        const lineHeight = 22

        const rows = [
          ['Standort / Baustelle', project?.location || '—'],
          ['Client / Auftraggeber', project?.client || '—'],
          ['Firma', log?.external_company?.trim() || '—'],
          ['Bauleiternamen', asText(log?.site_managers_names) || '—'],
        ]

        const boxHeight = paddingTop + rows.length * lineHeight + paddingBottom

        drawSectionBox('', boxHeight, (contentStartY) => {
          let innerY = contentStartY

          rows.forEach(([label, value]) => {
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(11)
            pdf.setTextColor(70, 70, 70)
            pdf.text(`${label}:`, margin + paddingX, innerY)

            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(12)
            pdf.setTextColor(20, 20, 20)
            pdf.text(String(value || '—'), margin + paddingX + 120, innerY)

            innerY += lineHeight
          })
        })
      }

      addMetaBox()

      addPaginatedWorkersTable(
        'Firmen / Mitarbeiter / Stunden / Zeit',
        ['Firma', 'Mitarbeiter', 'Stunden', 'Zeit'],
        workers.length === 0
          ? []
          : workers.map((w) => [
              w.company || '—',
              w.name || '—',
              formatHours(w.hours),
              w.time_range || '—',
            ])
      )


      addSmallTableBox(
        'Besprechungen',
        ['Thema', 'Termin'],
        meetings.length === 0
          ? []
          : meetings.map((row) => [
              row.thema || '—',
              row.termin || '—',
            ])
      )

      addSmallTableBox(
        'Vorkommnisse',
        ['Vorkommnis', 'Erlediger', 'Status', 'Termin'],
        events.length === 0
          ? []
          : events.map((row) => [
              row.text || '—',
              row.erlediger || '—',
              row.status || '—',
              row.termin || '—',
            ])
      )

      addSectionTitle('Fotos')

      if (photos.length === 0) {
        addTextBlock('Fotos', 'Keine Fotos vorhanden.')
      } else {
        const MAX_PHOTOS = 12
        const limitedPhotos = photos.slice(0, MAX_PHOTOS)

        const photoWidth = (contentWidth - 16) / 2
        const photoHeight = 150
        const captionHeight = 26

        for (let i = 0; i < limitedPhotos.length; i++) {
          const p = limitedPhotos[i]
          const url = photoUrls[p.path]
          if (!url) continue

          const isLeft = i % 2 === 0
          const x = isLeft ? margin : margin + photoWidth + 16

          if (isLeft) {
            ensureSpace(photoHeight + captionHeight + 20)
          }

          const blockY = y

          try {
            pdf.setDrawColor(225, 225, 225)
            pdf.roundedRect(x, blockY, photoWidth, photoHeight, 8, 8)

            pdf.addImage(
              url,
              'JPEG',
              x + 2,
              blockY + 2,
              photoWidth - 4,
              photoHeight - 4
            )
          } catch {
            continue
          }

          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(8)
          pdf.setTextColor(90, 90, 90)
          pdf.text(
            `Baustelle: ${project?.location || '—'}`,
            x,
            blockY + photoHeight + 10
          )
          pdf.text(
            `Zeit: ${formatDateTime(p.created_at) || '—'}`,
            x,
            blockY + photoHeight + 20
          )

          if (!isLeft) {
            y += photoHeight + captionHeight + 18
          }
        }

        if (limitedPhotos.length % 2 === 1) {
          y += photoHeight + captionHeight + 18
        }
      }

          const pageCount = pdf.getNumberOfPages()

          for (let page = 1; page <= pageCount; page++) {
            pdf.setPage(page)
            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(9)
            pdf.setTextColor(120, 120, 120)
            pdf.text('Erstellt mit GerüstPro app', margin, pageHeight - 16)
          }

          const fileName = `${safeFileName(projectName)}_${safeFileName(title)}.pdf`
          pdf.save(fileName)
        } catch (e: any) {
          setMsg(e?.message ?? 'PDF-Erstellung fehlgeschlagen.')
        } finally {
          setPdfBusy(false)
        }
      }

  if (!projectId || !logId) {
    return (
      <div className="page">
        <h1 className="h1">Tagesbericht</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          projectId/logId fehlt in der URL.
        </p>
        <style jsx>{baseStyles}</style>
      </div>
    )
  }

  const logTitle = log?.description?.trim() ? log.description : 'Tagesbericht'
  const projectTitle = project?.name ?? 'Projekt'
  const photoCount = photos.length
  const effectiveLogoUrl = project?.logo_url || profile?.logo_url || ''

  return (
    <RequireAuth>
    <div className="page">
      <div className="topRow">
        <Link className="backLink" href={`/projects/${projectId}`}>
          ← Zurück zum Projekt
        </Link>

        <div className="btnRow">
          <button
            className="btn"
            onClick={exportPdf}
            type="button"
            disabled={pdfBusy || loading}
          >
            {pdfBusy ? 'PDF wird erstellt…' : 'PDF herunterladen'}
          </button>

          <button
            className="btn"
            onClick={() => window.print()}
            type="button"
          >
            Drucken
          </button>

          <button
            className="btnPrimary"
            onClick={() => router.push(`/projects/${projectId}/logs/${logId}/edit`)}
            type="button"
          >
            Bearbeiten
          </button>
        </div>
      </div>

      {msg ? <div className="error">{msg}</div> : null}

      {loading ? (
        <p className="muted" style={{ marginTop: 16 }}>
          Wird geladen…
        </p>
      ) : log ? (
        <>
          <div className="headerCard">
            <div className="headerLeft">
              <h1 className="h1">{logTitle}</h1>

              <div className="meta">
                <span>{formatDateLong(log.log_date)}</span>
                <span className="dot">•</span>
                <span className="strong">{projectTitle}</span>
              </div>

              <div className="metaBlock">
                <div className="metaLine">
                  <span className="metaLabel">Standort / Baustelle:</span>{' '}
                  <span>{project?.location || '—'}</span>
                </div>
                <div className="metaLine">
                  <span className="metaLabel">Client / Auftraggeber:</span>{' '}
                  <span>{project?.client || '—'}</span>
                </div>
                <div className="metaLine">
                  <span className="metaLabel">Firma:</span>{' '}
                  <span>{log.external_company?.trim() ? log.external_company : '—'}</span>
                </div>
                <div className="metaLine">
                  <span className="metaLabel">Bauleiternamen:</span>{' '}
                  <span>{asText(log.site_managers_names) || '—'}</span>
                </div>
              </div>
            </div>

            <div className="headerRight">
              {effectiveLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={effectiveLogoUrl} alt="Firmenlogo" className="logo" />
              ) : (
                <div className="logoPlaceholder">Logo</div>
              )}
            </div>
          </div>

          <div className="grid">
            <div className="card">
              <div className="cardTitle">Firmen / Mitarbeiter / Stunden / Zeit</div>

              {workers.length === 0 ? (
                <div className="muted" style={{ fontWeight: 900 }}>
                  Keine Mitarbeiterdaten vorhanden.
                </div>
              ) : (
                <div className="tableWrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Firma</th>
                        <th>Mitarbeiter</th>
                        <th>Stunden</th>
                        <th>Zeit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workers.map((row) => (
                        <tr key={row.id}>
                          <td>{row.company || '—'}</td>
                          <td>{row.name || '—'}</td>
                          <td>{formatHours(row.hours)}</td>
                          <td>{row.time_range || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card">
              <div className="cardTitle">Ausgeführte Arbeiten</div>
              <div className="cardValue workDescription">
                {log.work_description?.trim() ? log.work_description : '(leer)'}
              </div>
            </div>

            <div className="card">
              <div className="cardTitle">Bemerkungen</div>
              <div className="cardValue workDescription">
                {log.remarks?.trim() ? log.remarks : '(leer)'}
              </div>
            </div>

            <div className="card">
              <div className="cardTitle">Besprechungen</div>

              {meetings.length === 0 ? (
                <div className="muted" style={{ fontWeight: 900 }}>
                  Keine Besprechungen vorhanden.
                </div>
              ) : (
                <div className="tableWrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Thema</th>
                        <th>Termin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meetings.map((row) => (
                        <tr key={row.id}>
                          <td>{row.thema || '—'}</td>
                          <td>{row.termin || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card">
              <div className="cardTitle">Vorkommnisse</div>

              {events.length === 0 ? (
                <div className="muted" style={{ fontWeight: 900 }}>
                  Keine Vorkommnisse vorhanden.
                </div>
              ) : (
                <div className="tableWrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Vorkommnis</th>
                        <th>Erlediger</th>
                        <th>Status</th>
                        <th>Termin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((row) => (
                        <tr key={row.id}>
                          <td>{row.text || '—'}</td>
                          <td>{row.erlediger || '—'}</td>
                          <td>{row.status || '—'}</td>
                          <td>{row.termin || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card">
              <div className="cardTitle">Fotos</div>

              <div className="photoMeta">
                {photoCount === 0
                  ? 'Keine Fotos'
                  : `${photoCount} Foto${photoCount === 1 ? '' : 's'} hinzugefügt`}
              </div>

              {photos.length === 0 ? (
                <div className="muted" style={{ fontWeight: 900 }}>
                  Keine Fotos für diesen Tagesbericht.
                </div>
              ) : (
                <div className="photos">
                  {photos.map((p) => {
                    const url = photoUrls[p.path]
                    return (
                      <div key={p.path} className="photoCard">
                        <a
                          className="photo"
                          href={url || undefined}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => {
                            if (!url) e.preventDefault()
                          }}
                          aria-disabled={!url}
                          title={!url ? 'Wird geladen…' : 'Bild öffnen'}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              url ||
                              'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
                            }
                            alt="Log photo"
                            loading="lazy"
                            decoding="async"
                          />
                        </a>

                        <div className="photoInfo">
                          <div>
                            <span className="photoLabel">Baustelle:</span> {project?.location || '—'}
                          </div>
                          <div>
                            <span className="photoLabel">Zeit:</span> {formatDateTime(p.created_at)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="card">
          <div className="cardTitle">Nicht gefunden</div>
          <div className="cardValue">
            Dieser Tagesbericht existiert nicht oder ist nicht zugänglich.
          </div>
        </div>
      )}
      <div className="printFooter">Erstellt mit GerüstPro app</div>
      <style jsx>{baseStyles}</style>

      <style jsx>{`
        .page{max-width:1080px;margin:0 auto;padding:1rem;color:var(--text);overflow-x:hidden;}
        .h1{font-size:44px;font-weight:950;margin:0;color:var(--text);word-break:break-word;}
        .muted{color:var(--muted);font-weight:800;}
        .error{margin-top:12px;color:#ff6b6b;font-weight:950;}

        .topRow{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;}
        .backLink{color:var(--muted);text-decoration:none;font-weight:900;}
        .backLink:hover{color:var(--text);}

        .btnRow{display:flex;gap:10px;flex-wrap:wrap;max-width:100%;}
        .btn,.btnPrimary{
          min-height:44px;
          padding:10px 14px;
          border-radius:14px;
          cursor:pointer;
          font-weight:950;
          transition:transform .15s ease, background .15s ease, border-color .15s ease, box-shadow .15s ease, opacity .15s ease;
          max-width:100%;
          white-space:nowrap;
        }
        .btn{border:1px solid var(--border);background:var(--chip);color:var(--text);}
        .btn:hover{transform:translateY(-1px);box-shadow:0 10px 30px rgba(0,0,0,.18);}
        .btn:active{transform:translateY(0px) scale(.995);}
        .btn:disabled{opacity:.6;cursor:not-allowed;transform:none;box-shadow:none;}

        .btnPrimary{border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.10);color:var(--text);}
        .btnPrimary:hover{transform:translateY(-1px);box-shadow:0 10px 30px rgba(0,0,0,.22);}
        .btnPrimary:active{transform:translateY(0px) scale(.995);}

        .headerCard{
          margin-top:10px;
          border:1px solid var(--border);
          background:var(--chip);
          border-radius:18px;
          padding:18px;
          display:grid;
          grid-template-columns:1fr 140px;
          gap:18px;
          align-items:start;
        }

        .headerRight{
          display:flex;
          justify-content:flex-end;
        }

.logo{
  width:120px;
  height:auto;
  object-fit:contain;
  background:transparent;
  padding:0;
  border:none;
}

        .logoPlaceholder{
          width:120px;
          height:80px;
          border-radius:10px;
          border:1px dashed var(--border);
          display:flex;
          align-items:center;
          justify-content:center;
          color:var(--muted);
          font-weight:900;
        }

        .meta{margin-top:10px;color:var(--muted);font-weight:900;display:flex;gap:10px;flex-wrap:wrap;}
        .dot{opacity:.6;}
        .strong{color:var(--text);opacity:.95;}

        .metaBlock{margin-top:14px;display:grid;gap:8px;}
        .metaLine{color:var(--text);font-weight:800;line-height:1.4;}
        .metaLabel{color:var(--muted);font-weight:900;}

        .grid{display:grid;gap:14px;margin-top:14px;}
        .card{
          border:1px solid var(--border);
          background:var(--chip);
          border-radius:18px;
          padding:16px;
          color:var(--text);
          overflow:hidden;
          min-width:0;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .cardTitle{color:var(--muted);font-weight:950;font-size:14px;margin-bottom:10px;}
        .cardValue{
          font-size:20px;
          font-weight:950;
          white-space:pre-wrap;
          min-width:0;
        }

        .workDescription{
          max-height:50vh;
          overflow-y:auto;
          overflow-x:hidden;
          padding-right:4px;
          white-space:pre-wrap;
          overflow-wrap:anywhere;
          word-break:break-word;
        }

        .tableWrap{
          width:100%;
          overflow-x:auto;
          border:1px solid rgba(255,255,255,.06);
          border-radius:14px;
        }

        .table{
          width:100%;
          border-collapse:collapse;
          min-width:640px;
        }

        .table th,
        .table td{
          text-align:left;
          padding:12px 12px;
          border-bottom:1px solid rgba(255,255,255,.08);
          vertical-align:top;
        }

        .table th{
          color:var(--muted);
          font-size:13px;
          font-weight:950;
          background:rgba(255,255,255,.03);
        }

        .table td{
          color:var(--text);
          font-weight:800;
          font-size:14px;
          line-height:1.45;
        }

        .table tbody tr:last-child td{
          border-bottom:none;
        }

        .photoMeta{
          color:var(--muted);
          font-weight:900;
          margin-bottom:10px;
        }

        .photos{display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr));}
        @media(max-width:820px){.photos{grid-template-columns:1fr;}}
        @media(max-width:720px){
          .btn,.btnPrimary{flex:1;}
          .headerCard{grid-template-columns:1fr;}
          .headerRight{justify-content:flex-start;}
        }

        .photoCard{
          border:1px solid var(--border);
          background:rgba(255,255,255,.03);
          border-radius:16px;
          overflow:hidden;
          min-width:0;
        }
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .photo{
          display:block;
          background:rgba(255,255,255,.03);
        }

        .photo[aria-disabled="true"]{opacity:.6;pointer-events:none;}
        .photo img{
          width:100%;
          height:220px;
          object-fit:cover;
          display:block;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .photoInfo{
          padding:10px 12px 12px;
          display:grid;
          gap:6px;
          color:var(--muted);
          font-weight:900;
          font-size:13px;
          min-width:0;
        }

        .photoLabel{
          color:var(--text);
          opacity:.92;
        }
      `}</style>

      <style jsx>{`
        @media print{
          .topRow,.btnRow,.backLink{display:none!important;}
          .page{padding:0!important;}

          .grid{
            display:block !important;
          }

          .card{
            break-inside:auto !important;
            page-break-inside:auto !important;
            overflow:visible !important;
            box-shadow:none !important;
          }

          .photos{
            display:block !important;
          }

          .photoWrap{
            display:block !important;
            break-inside:avoid !important;
            page-break-inside:avoid !important;
            margin-bottom:24px !important;
          }

          .photoCard{
            display:block !important;
            break-inside:avoid !important;
            page-break-inside:avoid !important;
            overflow:visible !important;
          }

          .photo{
            display:block !important;
            break-inside:avoid !important;
            page-break-inside:avoid !important;
          }

          .photo img{
            display:block !important;
            width:100% !important;
            height:auto !important;
            max-height:420px !important;
            object-fit:contain !important;
            break-inside:avoid !important;
            page-break-inside:avoid !important;
          }

          .printFooter{
            display:none;
          }

          @media print{
            .topRow,.btnRow,.backLink{display:none!important;}
            .page{padding:0!important;}

            .grid{
              display:block !important;
            }

            .card{
              break-inside:auto !important;
              page-break-inside:auto !important;
              overflow:visible !important;
              box-shadow:none !important;
            }

            .photos{
              display:block !important;
            }

            .photoWrap{
              display:block !important;
              break-inside:avoid !important;
              page-break-inside:avoid !important;
              margin-bottom:24px !important;
            }

            .photoCard{
              display:block !important;
              break-inside:avoid !important;
              page-break-inside:avoid !important;
              overflow:visible !important;
            }

            .photo{
              display:block !important;
              break-inside:avoid !important;
              page-break-inside:avoid !important;
            }

            .photo img{
              display:block !important;
              width:100% !important;
              height:auto !important;
              max-height:380px !important;
              object-fit:contain !important;
              break-inside:avoid !important;
              page-break-inside:avoid !important;
            }

            .printFooter{
              display:block !important;
              position:fixed;
              bottom:10px;
              left:0;
              right:0;
              text-align:center;
              font-size:12px;
              color:#666;
            }
          }
      `}</style>
    </div>
      </RequireAuth>
  )
}

const baseStyles = `
  .page{max-width:1080px;margin:0 auto;padding:1rem;color:var(--text);overflow-x:hidden;}
`