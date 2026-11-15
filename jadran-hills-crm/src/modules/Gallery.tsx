import { ChevronLeft, ChevronRight, ImagePlus, Pencil, Star, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { uid } from '../lib/format'
import { hostAssets, MEDIA_KIND, MEDIA_KIND_ORDER, mediaSrc, prepareImage, uploadErrorText } from '../lib/media'
import { hosted } from '../lib/platform'
import { useStore } from '../store'
import type { ID, MediaItem, MediaKind } from '../types'
import { cx } from '../ui/cx'
import { Badge, Button, Check, Empty, Field, Modal, Note, PageHead, Select, Tabs, TextArea, TextInput } from '../ui/kit'
import { useMountTransition } from '../ui/motion'

type Assets = NonNullable<Awaited<ReturnType<typeof hostAssets>>>
type Filter = 'all' | MediaKind

/** Jeden obrázok vo vyhradenej ploche: čiarová kresba, výkres na „papieri“ alebo fotografia. */
function Picture({ item, zoom, lightbox }: { item: MediaItem; zoom?: boolean; lightbox?: boolean }) {
  const src = mediaSrc(item)
  const [failed, setFailed] = useState<string | null>(null)
  if (!src || failed === src) {
    return <div className="grid h-full w-full place-items-center px-4 text-center text-[12.5px] text-muted">Obrázok tu nie je dostupný</div>
  }
  if (item.line) {
    const url = `url("${src}")`
    return <div role="img" aria-label={item.title} className={cx('lineart h-full w-full', zoom && 'media-zoom')} style={{ WebkitMaskImage: url, maskImage: url }} />
  }
  const drawing = item.kind !== 'photo' && item.kind !== 'visual'
  return (
    <img
      src={src}
      alt={item.title}
      loading="lazy"
      onError={() => setFailed(src)}
      className={cx('h-full w-full', zoom && 'media-zoom', drawing ? 'object-contain' : 'object-cover', drawing && !lightbox && 'drawing')}
    />
  )
}

export default function Gallery() {
  const { data, add, patch, remove, set, sync } = useStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [openId, setOpenId] = useState<ID | null>(null)
  const [edit, setEdit] = useState<MediaItem | null>(null)
  const [drop, setDrop] = useState<MediaItem | null>(null)
  const [assets, setAssets] = useState<Assets | null>(null)
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const readOnly = sync.state === 'readonly'

  useEffect(() => {
    let alive = true
    void hostAssets().then((a) => alive && setAssets(a))
    return () => {
      alive = false
    }
  }, [])

  const kinds = useMemo(() => MEDIA_KIND_ORDER.filter((k) => data.media.some((m) => m.kind === k)), [data.media])
  const active: Filter = filter !== 'all' && !kinds.includes(filter) ? 'all' : filter
  const items = useMemo(
    () =>
      [...data.media]
        .filter((m) => active === 'all' || m.kind === active)
        .sort((a, b) => Number(b.cover) - Number(a.cover) || MEDIA_KIND_ORDER.indexOf(a.kind) - MEDIA_KIND_ORDER.indexOf(b.kind)),
    [data.media, active],
  )
  const openIndex = items.findIndex((m) => m.id === openId)

  const onFiles = async (list: FileList | null) => {
    if (!list || !assets) return
    const files = [...list].filter((f) => f.type.startsWith('image/')).slice(0, 20)
    if (files.length === 0) return
    setError('')
    setBusy({ done: 0, total: files.length })
    for (const f of files) {
      try {
        const img = await prepareImage(f)
        const stored = await assets.upload(img.blob, { type: img.type })
        add('media', {
          id: uid('med'),
          title: f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
          note: '',
          kind: 'photo',
          assetId: stored.id,
          file: null,
          src: null,
          w: img.w,
          h: img.h,
          line: false,
          cover: false,
          addedAt: new Date().toISOString(),
        })
      } catch (e) {
        setError(uploadErrorText(e))
        break
      }
      setBusy((b) => (b ? { ...b, done: b.done + 1 } : b))
    }
    setBusy(null)
    if (file.current) file.current.value = ''
  }

  const makeCover = (id: ID) => set((d) => ({ ...d, media: d.media.map((m) => (m.cover === (m.id === id) ? m : { ...m, cover: m.id === id })) }))

  const confirmDrop = () => {
    if (!drop) return
    remove('media', drop.id)
    // Súbor v úložisku sa odstraňuje spolu so záznamom – inak by zaberal miesto bez využitia.
    if (drop.assetId && assets) void assets.delete(drop.assetId).catch(() => {})
    if (openId === drop.id) setOpenId(null)
    setDrop(null)
  }

  return (
    <>
      <PageHead
        title="Galéria"
        sub="Pohľady, pôdorysy, rezy, situácia a ďalšie obrázky projektu. Titulný obrázok sa zobrazuje na prehľade a na uvítacej obrazovke."
        actions={
          assets && !readOnly ? (
            <>
              <Button variant="primary" icon={<ImagePlus size={15} />} onClick={() => file.current?.click()} disabled={busy !== null}>
                {busy ? `Nahrávam ${busy.done + 1} / ${busy.total}…` : 'Pridať obrázky'}
              </Button>
              <input id="gallery-file" ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => void onFiles(e.target.files)} />
            </>
          ) : undefined
        }
      />

      {error && (
        <div>
          <Note tone="crit">{error}</Note>
        </div>
      )}

      {kinds.length > 1 && (
        <div>
          <Tabs<Filter>
            value={active}
            onChange={setFilter}
            tabs={[{ id: 'all', label: `Všetko (${data.media.length})` }, ...kinds.map((k) => ({ id: k as Filter, label: MEDIA_KIND[k] }))]}
          />
        </div>
      )}

      {data.media.length === 0 ? (
        <Empty
          title="Zatiaľ žiadne obrázky"
          text={
            assets && !readOnly
              ? 'Pridajte vizualizácie, fotografie pozemku alebo výkresy. Prvý obrázok sa stane titulným.'
              : hosted
                ? 'Obrázky môže pridávať ten, kto má oprávnenie stránku upravovať.'
                : 'Obrázky sa nahrávajú na stránke s prihlásením; táto samostatná kópia zobrazuje len pribalené súbory.'
          }
        />
      ) : (
        <div key={active} className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setOpenId(m.id)}
              className="media-tile group cursor-pointer overflow-hidden rounded-xl border border-line bg-surface p-0 text-left shadow-[var(--shadow)]"
            >
              <div className={cx('aspect-[4/3] overflow-hidden text-ink', m.kind === 'photo' || m.kind === 'visual' ? 'bg-surface-2' : 'paper p-4')}>
                <Picture item={m} zoom />
              </div>
              <div className="flex items-start justify-between gap-3 border-t border-line px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-semibold tracking-[-0.01em] text-ink">{m.title}</div>
                  <div className="truncate text-[12.5px] text-muted">{MEDIA_KIND[m.kind]}{m.note ? ` · ${m.note}` : ''}</div>
                </div>
                {m.cover && <Badge tone="accent"><Star size={11} aria-hidden /> Titulný</Badge>}
              </div>
            </button>
          ))}
        </div>
      )}

      {!assets && !readOnly && data.media.length > 0 && (
        <div className="mt-4">
          <Note>
            {hosted
              ? 'Pridávať a odstraňovať obrázky môže ten, kto má oprávnenie stránku upravovať.'
              : 'Nové obrázky sa nahrávajú na stránke s prihlásením; táto samostatná kópia zobrazuje pribalené súbory.'}
          </Note>
        </div>
      )}

      <Lightbox
        items={items}
        index={openIndex}
        canEdit={!readOnly}
        paused={edit !== null || drop !== null}
        onClose={() => setOpenId(null)}
        onGo={(i) => setOpenId(items[i]?.id ?? null)}
        onCover={makeCover}
        onEdit={setEdit}
        onDrop={setDrop}
      />

      {edit && (
        <EditMedia
          item={edit}
          onClose={() => setEdit(null)}
          onSave={(p) => {
            patch('media', edit.id, p)
            setEdit(null)
          }}
        />
      )}

      {drop && (
        <Modal
          title="Odstrániť obrázok?"
          onClose={() => setDrop(null)}
          footer={
            <>
              <Button onClick={() => setDrop(null)}>Zrušiť</Button>
              <Button variant="primary" onClick={confirmDrop}>Odstrániť</Button>
            </>
          }
        >
          <p className="m-0 text-[13.5px] text-ink-2">
            Obrázok „{drop.title}“ sa odstráni z galérie{drop.assetId ? ' aj z úložiska stránky' : ''} pre všetkých. Krok sa nedá vrátiť.
          </p>
        </Modal>
      )}
    </>
  )
}

// ───────────────────────── Prehliadanie na celej obrazovke ─────────────────────────

interface LightboxProps {
  items: MediaItem[]
  index: number
  canEdit: boolean
  /** Nad prehliadačom je otvorené okno – klávesy patria jemu. */
  paused: boolean
  onClose(): void
  onGo(index: number): void
  onCover(id: ID): void
  onEdit(item: MediaItem): void
  onDrop(item: MediaItem): void
}

function Lightbox({ items, index, canEdit, paused, onClose, onGo, onCover, onEdit, onDrop }: LightboxProps) {
  const open = index >= 0
  const { mounted, phase } = useMountTransition(open, 240)
  // Pri zatváraní ostáva na obrazovke posledný obrázok, kým dobehne animácia.
  const [last, setLast] = useState(index)
  if (open && index !== last) setLast(index)
  const item = items[open ? index : last]
  const count = items.length
  const go = useCallback((d: number) => onGo((index + d + count) % count), [onGo, index, count])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (paused) return
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, paused, onClose, go])

  if (!mounted || !item) return null
  const drawing = !item.line && item.kind !== 'photo' && item.kind !== 'visual'
  return (
    <div className="lightbox no-print" data-phase={phase} role="dialog" aria-modal="true" aria-label={item.title}>
      <div className="flex items-center justify-between gap-3 pb-3">
        <span className="text-[13px] tabular-nums opacity-70">{(open ? index : last) + 1} / {count}</span>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canEdit && !item.cover && (
            <button type="button" className="lightbox-btn" onClick={() => onCover(item.id)}>
              <Star size={14} aria-hidden /> Nastaviť ako titulný
            </button>
          )}
          {canEdit && (
            <button type="button" className="lightbox-btn" onClick={() => onEdit(item)} aria-label="Upraviť popis" title="Upraviť popis">
              <Pencil size={14} />
            </button>
          )}
          {canEdit && (
            <button type="button" className="lightbox-btn" onClick={() => onDrop(item)} aria-label="Odstrániť obrázok" title="Odstrániť">
              <Trash2 size={14} />
            </button>
          )}
          <button type="button" className="lightbox-btn" onClick={onClose} aria-label="Zavrieť" title="Zavrieť">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="relative min-h-0" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div key={item.id} className={cx('lightbox-stage mx-auto h-full w-full max-w-[1500px] overflow-hidden rounded-2xl', drawing && 'bg-white p-3 sm:p-6')}>
          <Picture item={item} lightbox />
        </div>
        {count > 1 && (
          <>
            <button type="button" className="lightbox-btn absolute left-2 top-1/2 -translate-y-1/2" onClick={() => go(-1)} aria-label="Predchádzajúci obrázok">
              <ChevronLeft size={18} />
            </button>
            <button type="button" className="lightbox-btn absolute right-2 top-1/2 -translate-y-1/2" onClick={() => go(1)} aria-label="Ďalší obrázok">
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      <div className="mx-auto w-full max-w-3xl pt-3 text-center">
        <div className="text-[16px] font-semibold tracking-[-0.015em]">{item.title}</div>
        <div className="mt-0.5 text-[13px] opacity-70">
          {MEDIA_KIND[item.kind]}
          {item.note ? ` · ${item.note}` : ''}
        </div>
      </div>
    </div>
  )
}

// ───────────────────────── Úprava popisu ─────────────────────────

function EditMedia({ item, onClose, onSave }: { item: MediaItem; onClose(): void; onSave(p: Partial<MediaItem>): void }) {
  const [title, setTitle] = useState(item.title)
  const [note, setNote] = useState(item.note)
  const [kind, setKind] = useState<MediaKind>(item.kind)
  const [line, setLine] = useState(item.line)
  return (
    <Modal
      title="Popis obrázka"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Zrušiť</Button>
          <Button variant="primary" onClick={() => onSave({ title: title.trim() || item.title, note: note.trim(), kind, line })}>Uložiť</Button>
        </>
      }
    >
      <div className="grid gap-3">
        <Field label="Názov"><TextInput value={title} onChange={setTitle} /></Field>
        <Field label="Druh">
          <Select value={kind} onChange={setKind} options={MEDIA_KIND_ORDER.map((k) => ({ value: k, label: MEDIA_KIND[k] }))} />
        </Field>
        <Field label="Poznámka"><TextArea value={note} onChange={setNote} rows={2} /></Field>
        <Check checked={line} onChange={setLine} label="Čiarová kresba s priehľadným pozadím (farbí sa podľa témy)" />
      </div>
    </Modal>
  )
}
