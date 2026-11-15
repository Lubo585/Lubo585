// Export dát do súborov (záloha JSON, tabuľky CSV pre Excel).

import type { ProjectData } from '../types'
import { capability, errorCode, hosted } from './platform'

interface HostDownloads {
  save(request: { filename: string; data: string }): Promise<unknown>
}

function anchorDownload(name: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/**
 * Ponúkne súbor na uloženie. U hostiteľa ide cez jeho potvrdzovacie okno
 * (priame sťahovanie tam nie je povolené), inak bežným odkazom.
 */
export function downloadFile(name: string, content: string, mime: string): void {
  if (!hosted) {
    anchorDownload(name, content, mime)
    return
  }
  void (async () => {
    const downloads = await capability<HostDownloads>('downloads')
    if (!downloads) {
      anchorDownload(name, content, mime)
      return
    }
    try {
      await downloads.save({ filename: name, data: content })
    } catch (e) {
      // „declined“ = používateľ uloženie odmietol; ostatné chyby skúsime bežným odkazom.
      if (errorCode(e) !== 'declined') anchorDownload(name, content, mime)
    }
  })()
}

export function exportJson(data: ProjectData): void {
  const stamp = new Date().toISOString().slice(0, 10)
  const slug = data.project.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
  downloadFile(`${slug || 'projekt'}-${stamp}.json`, JSON.stringify(data, null, 2), 'application/json')
}

/** CSV pre Excel: bodkočiarka ako oddeľovač, desatinná čiarka, UTF-8 s BOM. */
export function exportCsv(name: string, rows: (string | number)[][]): void {
  const cell = (v: string | number) => {
    if (typeof v === 'number') return Number.isFinite(v) ? String(Math.round(v * 100) / 100).replace('.', ',') : ''
    return /[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
  }
  const body = rows.map((r) => r.map(cell).join(';')).join('\r\n')
  downloadFile(name, `﻿${body}`, 'text/csv;charset=utf-8')
}
