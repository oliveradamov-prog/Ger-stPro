'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

const COL_WORKERS_COUNT = 'workers_count'
const COL_SITE_MANAGERS_COUNT = 'site_managers_count'
const COL_WORKERS_NAMES = 'workers_names'
const COL_SITE_MANAGERS_NAMES = 'site_managers_names'

const PHOTOS_BUCKET = process.env.NEXT_PUBLIC_PHOTOS_BUCKET || 'DAILY-LOG-PHOTOS'
const PHOTOS_TABLE = 'daily_log_photos'

type DailyLog = {
  id: string
  project_id: string
  user_id: string
  log_date: string
  description: string | null
  work_description: string | null
  created_at: string
  [COL_WORKERS_COUNT]?: number | null
  [COL_SITE_MANAGERS_COUNT]?: number | null
  [COL_WORKERS_NAMES]?: string | string[] | null
  [COL_SITE_MANAGERS_NAMES]?: string | string[] | null
}

type Project = {
  id: string
  name: string
  location: string | null
  client: string | null
}

type PhotoRow = {
  log_id: string
  path: string
  created_at?: string
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

function asText(v: any) {
  if (v == null) return ''
  if (Array.isArray(v)) return v.join(', ')
  return String(v)
}

function safeFileName(name: string) {
  return String(name || 'file').replace(/[^\w.\-]+/g, '_')
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
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
  const [log, setLog] = useState<DailyLog | null>(null)

  const [photos, setPhotos] = useState<PhotoRow[]>([])
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [photoPdfUrls, setPhotoPdfUrls] = useState<Record<string, string>>({})

  const [pdfImgsLoading, setPdfImgsLoading] = useState(false)
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
          .select('id, name, location, client')
          .eq('id', projectId)
          .single()

        if (projectError) throw projectError

        const { data: logData, error: logError } = await supabase
          .from('daily_logs')
          .select(
            [
              'id, project_id, user_id, log_date, description, work_description, created_at',
              COL_WORKERS_COUNT,
              COL_SITE_MANAGERS_COUNT,
              COL_WORKERS_NAMES,
              COL_SITE_MANAGERS_NAMES,
            ].join(', ')
          )
          .eq('id', logId)
          .eq('project_id', projectId)
          .single()

        if (logError) throw logError

        const { data: photoRows, error: photoError } = await supabase
          .from(PHOTOS_TABLE)
          .select('log_id, path, created_at')
          .eq('log_id', logId)
          .order('created_at', { ascending: false })

        if (photoError) console.warn(photoError.message)

        const safeLog = (Array.isArray(logData) ? logData[0] : logData) as DailyLog | null

        if (!safeLog) {
          throw new Error('Log nicht gefunden')
        }

        if (!cancelled) {
          setProject(projectData as Project)
          setLog(safeLog)
          setPhotos((photoRows as PhotoRow[]) ?? [])
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

  useEffect(() => {
    let cancelled = false

    async function buildPdfUrls() {
      if (!photos.length) {
        setPhotoPdfUrls({})
        return
      }

      setPdfImgsLoading(true)

      try {
        const limited = photos.slice(0, 12)
        const pairs: Array<[string, string]> = []

        for (const p of limited) {
          const { data, error } = await supabase.storage.from(PHOTOS_BUCKET).download(p.path)
          if (error) throw error
          const dataUrl = await blobToDataUrl(data as Blob)
          pairs.push([p.path, dataUrl])
        }

        if (!cancelled) setPhotoPdfUrls(Object.fromEntries(pairs))
      } catch {
        if (!cancelled) setPhotoPdfUrls({})
      } finally {
        if (!cancelled) setPdfImgsLoading(false)
      }
    }

    buildPdfUrls()
    return () => {
      cancelled = true
    }
  }, [photos])

  async function exportPdf() {
    setMsg('')

    try {
      setPdfBusy(true)

      const [{ jsPDF }] = await Promise.all([import('jspdf')])

      const pdf = new jsPDF('p', 'pt', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()

      const margin = 28
      const contentWidth = pageWidth - margin * 2

      let y = margin

      const addText = (text: string, x: number, top: number, options?: {
        size?: number
        bold?: boolean
        color?: number[]
        maxWidth?: number
        lineHeight?: number
      }) => {
        // ...
        const size = options?.size ?? 12
        const bold = options?.bold ?? false
        const color = options?.color ?? [17, 17, 17]
        const maxWidth = options?.maxWidth ?? contentWidth
        const lineHeight = options?.lineHeight ?? 1.35

        pdf.setFont('helvetica', bold ? 'bold' : 'normal')
        pdf.setFontSize(size)
        pdf.setTextColor(color[0], color[1], color[2])

        const lines = pdf.splitTextToSize(text || '', maxWidth)
        pdf.text(lines, x, top)

        return top + lines.length * size * lineHeight
      }

      const ensureSpace = (heightNeeded: number) => {
        if (y + heightNeeded > pageHeight - margin) {
          pdf.addPage()
          y = margin
        }
      }

      const logTitle = log?.description?.trim() ? log.description : 'Tagesbericht'
      const projectTitle = project?.name ?? 'Projekt'
      const photoCount = photos.length

      ensureSpace(140)

      y = addText(logTitle, margin, y, { size: 24, bold: true })
      y += 10

      y = addText(`Projekt: ${projectTitle}`, margin, y, { size: 11 })
      y = addText(`Baustelle: ${project?.location || '—'}`, margin, y, { size: 11 })
      y = addText(`Client / Auftraggeber: ${project?.client || '—'}`, margin, y, { size: 11 })
      y = addText(`Datum: ${formatDateLong(log?.log_date || '')}`, margin, y, { size: 11 })
      y = addText(`Fotos: ${photoCount}`, margin, y, { size: 11 })

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.text(`Arbeiter: ${(log as any)?.[COL_WORKERS_COUNT] ?? 0}`, pageWidth - margin, margin + 12, {
        align: 'right',
      })
      pdf.text(`Bauleiter: ${(log as any)?.[COL_SITE_MANAGERS_COUNT] ?? 0}`, pageWidth - margin, margin + 28, {
        align: 'right',
      })

      y += 10
      pdf.setDrawColor(229, 229, 229)
      pdf.line(margin, y, pageWidth - margin, y)
      y += 16

      ensureSpace(80)
      pdf.setDrawColor(229, 229, 229)
      pdf.roundedRect(margin, y, contentWidth / 2 - 6, 54, 10, 10)
      pdf.roundedRect(margin + contentWidth / 2 + 6, y, contentWidth / 2 - 6, 54, 10, 10)

      y = addText('Arbeiternamen', margin + 10, y + 16, {
        size: 11,
        bold: true,
        maxWidth: contentWidth / 2 - 26,
      })
      addText(asText((log as any)?.[COL_WORKERS_NAMES]) || '—', margin + 10, y + 4, {
        size: 10,
        maxWidth: contentWidth / 2 - 26,
      })

      const box2x = margin + contentWidth / 2 + 16
      addText('Bauleiternamen', box2x, y - 11, {
        size: 11,
        bold: true,
        maxWidth: contentWidth / 2 - 26,
      })
      addText(asText((log as any)?.[COL_SITE_MANAGERS_NAMES]) || '—', box2x, y + 4, {
        size: 10,
        maxWidth: contentWidth / 2 - 26,
      })

      y += 66

      const workText = log?.work_description?.trim() ? log.work_description : '(leer)'
      const workLines = pdf.splitTextToSize(workText, contentWidth - 20)
      const workHeight = Math.max(60, workLines.length * 13 + 26)

      ensureSpace(workHeight + 20)
      pdf.roundedRect(margin, y, contentWidth, workHeight, 10, 10)
      addText('Arbeitsbeschreibung', margin + 10, y + 16, {
        size: 11,
        bold: true,
        maxWidth: contentWidth - 20,
      })
      addText(workText, margin + 10, y + 34, {
        size: 10,
        maxWidth: contentWidth - 20,
        lineHeight: 1.4,
      })

      y += workHeight + 18

      ensureSpace(30)
      y = addText(`Fotos (${photoCount})`, margin, y, { size: 14, bold: true })
      y += 6

      if (photos.length) {
        const limited = photos.slice(0, 12)

        for (let i = 0; i < limited.length; i++) {
          const p = limited[i]
          const src = photoPdfUrls[p.path] || photoUrls[p.path]
          if (!src) continue

          const img = new Image()
          img.src = src

          await new Promise<void>((resolve) => {
            if (img.complete) return resolve()
            img.onload = () => resolve()
            img.onerror = () => resolve()
          })

          const naturalWidth = img.naturalWidth || 1200
          const naturalHeight = img.naturalHeight || 800

          const maxImgWidth = contentWidth - 20
          const maxImgHeight = 360

          const ratio = Math.min(maxImgWidth / naturalWidth, maxImgHeight / naturalHeight)
          const renderWidth = Math.max(80, naturalWidth * ratio)
          const renderHeight = Math.max(80, naturalHeight * ratio)

          const blockHeight = 28 + renderHeight + 22

          ensureSpace(blockHeight + 12)

          pdf.setDrawColor(238, 238, 238)
          pdf.roundedRect(margin, y, contentWidth, blockHeight, 10, 10)

          addText(
            `Foto ${i + 1} • Baustelle: ${project?.location || '—'} • Zeit: ${formatDateTime(p.created_at)}`,
            margin + 10,
            y + 16,
            { size: 9, color: [85, 85, 85], maxWidth: contentWidth - 20 }
          )

          const imgX = margin + (contentWidth - renderWidth) / 2
          const imgY = y + 28

          try {
            pdf.addImage(src, 'JPEG', imgX, imgY, renderWidth, renderHeight)
          } catch {
            try {
              pdf.addImage(src, 'PNG', imgX, imgY, renderWidth, renderHeight)
            } catch {}
          }

          y += blockHeight + 12
        }

        if (photos.length > 12) {
          ensureSpace(20)
          y = addText(
            'Hinweis: Im PDF werden die ersten 12 Fotos eingefügt, damit die Datei nicht zu groß wird.',
            margin,
            y,
            { size: 10, color: [102, 102, 102] }
          )
          y += 8
        }
      } else {
        y = addText('(Keine Fotos)', margin, y, { size: 10, color: [102, 102, 102] })
        y += 8
      }

      const footerText = `Erstellt mit GerüstPro App • ${new Date().toLocaleString('de-DE')}`
      const pageCount = pdf.getNumberOfPages()

      for (let p = 1; p <= pageCount; p++) {
        pdf.setPage(p)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(10)
        pdf.setTextColor(119, 119, 119)
        pdf.text(footerText, margin, pageHeight - 18)
      }

      const fileLogTitle = safeFileName(logTitle.slice(0, 80))
      const fileProjTitle = safeFileName(projectTitle.slice(0, 60))
      const blob = pdf.output('blob')
      downloadBlob(blob, `${fileLogTitle}_${fileProjTitle}.pdf`)
    } catch (e: any) {
      setMsg(`PDF-Export fehlgeschlagen: ${e?.message ?? 'Unbekannter Fehler'}`)
    } finally {
      setPdfBusy(false)
    }
  }

  function printPage() {
    window.print()
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

  return (
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
            disabled={pdfBusy || loading || !log}
            title={pdfImgsLoading ? 'Bilder werden vorbereitet…' : ''}
          >
            {pdfBusy ? 'PDF wird erstellt…' : pdfImgsLoading ? 'Bilder werden vorbereitet…' : 'PDF herunterladen'}
          </button>

          <button className="btn" onClick={printPage} type="button">
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
          <h1 className="h1" style={{ marginTop: 6 }}>
            {logTitle}
          </h1>

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
          </div>

          <div className="divider" />

          <div className="grid">
            <div className="card">
              <div className="cardTitle">Arbeitsbeschreibung</div>
              <div className="cardValue workDescription">
                {log.work_description?.trim() ? log.work_description : '(leer)'}
              </div>
            </div>

            <div className="card">
              <div className="cardTitle">Team</div>
              <div className="crewGrid">
                <div className="crewItem">
                  <div className="crewLabel">Anzahl Arbeiter</div>
                  <div className="crewValue">{(log as any)?.[COL_WORKERS_COUNT] ?? 0}</div>
                </div>
                <div className="crewItem">
                  <div className="crewLabel">Anzahl Bauleiter</div>
                  <div className="crewValue">{(log as any)?.[COL_SITE_MANAGERS_COUNT] ?? 0}</div>
                </div>
                <div className="crewItem">
                  <div className="crewLabel">Arbeiternamen</div>
                  <div className="crewText">{asText((log as any)?.[COL_WORKERS_NAMES]) || '—'}</div>
                </div>
                <div className="crewItem">
                  <div className="crewLabel">Bauleiternamen</div>
                  <div className="crewText">{asText((log as any)?.[COL_SITE_MANAGERS_NAMES]) || '—'}</div>
                </div>
              </div>
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
          <div className="cardValue">Dieser Tagesbericht existiert nicht oder ist nicht zugänglich.</div>
        </div>
      )}

      <style jsx>{baseStyles}</style>

      <style jsx>{`
        .page{max-width:980px;margin:0 auto;padding:1rem;color:var(--text);overflow-x:hidden;}
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

        .meta{margin-top:10px;color:var(--muted);font-weight:900;display:flex;gap:10px;flex-wrap:wrap;}
        .dot{opacity:.6;}
        .strong{color:var(--text);opacity:.95;}

        .metaBlock{margin-top:14px;display:grid;gap:8px;}
        .metaLine{color:var(--text);font-weight:800;line-height:1.4;}
        .metaLabel{color:var(--muted);font-weight:900;}

        .divider{margin:18px 0;height:1px;background:var(--border);opacity:.7;}
        .grid{display:grid;gap:14px;}
        .card{
          border:1px solid var(--border);
          background:var(--chip);
          border-radius:18px;
          padding:16px;
          color:var(--text);
          overflow:hidden;
          min-width:0;
        }
        .cardTitle{color:var(--muted);font-weight:950;font-size:14px;margin-bottom:8px;}
        .cardValue{
          font-size:20px;
          font-weight:950;
          white-space:pre-wrap;
          min-width:0;
        }

        .workDescription{
          max-height:40vh;
          overflow-y:auto;
          overflow-x:hidden;
          padding-right:4px;
          white-space:pre-wrap;
          overflow-wrap:anywhere;
          word-break:break-word;
          -webkit-overflow-scrolling:touch;
          min-width:0;
        }

        .crewGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
        @media(max-width:720px){
          .crewGrid{grid-template-columns:1fr;}
          .btn,.btnPrimary{flex:1;}
        }

        .crewItem{
          border:1px solid var(--border);
          background:rgba(255,255,255,.03);
          border-radius:14px;
          padding:12px;
          min-width:0;
          overflow:hidden;
        }
        .crewLabel{color:var(--muted);font-weight:950;font-size:13px;margin-bottom:6px;}
        .crewValue{font-weight:950;font-size:22px;}
        .crewText{
          font-weight:900;
          font-size:16px;
          white-space:pre-wrap;
          overflow-wrap:anywhere;
          word-break:break-word;
          min-width:0;
        }

        .photoMeta{
          color:var(--muted);
          font-weight:900;
          margin-bottom:10px;
        }

        .photos{display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr));}
        @media(max-width:720px){.photos{grid-template-columns:1fr;}}

        .photoCard{
          border:1px solid var(--border);
          background:rgba(255,255,255,.03);
          border-radius:16px;
          overflow:hidden;
          min-width:0;
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
        }
      `}</style>
    </div>
  )
}

const baseStyles = `
  .page{max-width:980px;margin:0 auto;padding:1rem;color:var(--text);overflow-x:hidden;}
`