'use client'
import { useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase, formatRupiah, type Anggota } from '@/lib/supabase'

const BULAN = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

type ParsedRow = {
  namaExcel: string
  hpExcel: string
  total: number
  anggotaId: string | null
  sudahAda: boolean
  include: boolean
}

// Normalisasi no HP supaya '+6281...', '081...', '81...' dianggap sama.
function normPhone(p?: string | null): string {
  if (!p) return ''
  let d = String(p).replace(/\D/g, '')
  if (d.startsWith('62')) d = d.slice(2)
  else if (d.startsWith('0')) d = d.slice(1)
  return d
}
function normName(n?: string | null): string {
  return (n || '').trim().toLowerCase().replace(/\s+/g, ' ')
}
function parseAmount(v: any): number {
  if (v == null || v === '') return 0
  if (typeof v === 'number') return v
  let s = String(v).trim().replace(/Rp\.?\s*/gi, '')
  s = s.replace(/[.,](?=\d{3}(\D|$))/g, '') // buang pemisah ribuan
  s = s.replace(/,/g, '.')
  const n = parseFloat(s.replace(/[^\d.-]/g, ''))
  return isNaN(n) ? 0 : n
}

function findHeaderRow(rows: any[][]) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue
    const namaCol = row.findIndex(c => typeof c === 'string' && /^nama$/i.test(c.trim()))
    const hpCol = row.findIndex(c => typeof c === 'string' && /(no\.?\s*hp|^hp$|telepon|kontak)/i.test(String(c).trim()))
    const totalCol = row.findIndex(c => typeof c === 'string' && /(total|jumlah)/i.test(String(c).trim()))
    if (namaCol >= 0 && hpCol >= 0 && totalCol >= 0) return { headerIdx: i, namaCol, hpCol, totalCol }
  }
  return null
}

export default function ImportModal({
  tahun, bulan, onClose, onImported,
}: { tahun: number; bulan: number; onClose: () => void; onImported: () => void }) {
  const [step, setStep] = useState<'pilih' | 'preview'>('pilih')
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [anggotaList, setAnggotaList] = useState<Anggota[]>([])
  const [kategoriId, setKategoriId] = useState<string | null>(null)
  const [parseError, setParseError] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  async function handleFile(file: File) {
    setParseError(''); setFileName(file.name)
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false }) as any[][]
    const found = findHeaderRow(raw)
    if (!found) { setParseError('Tidak ditemukan kolom "Nama", "No HP", dan "Total" di file ini.'); return }

    // Kategori berflag perpuluhan, dan anggota — dimuat sekali bersamaan parsing
    const [{ data: kat }, { data: ang }] = await Promise.all([
      supabase.from('kategori_persembahan').select('id').eq('is_perpuluhan', true).limit(1),
      supabase.from('anggota').select('id, nama, kontak, divisi_pelayanan, is_volunteer, wajib_perpuluhan, is_aktif'),
    ])
    if (!kat || kat.length === 0) {
      setParseError('Belum ada kategori persembahan dengan flag "perpuluhan" — atur dulu di menu Kategori.')
      return
    }
    const kid = kat[0].id
    setKategoriId(kid)
    const anggota = (ang ?? []) as Anggota[]
    setAnggotaList(anggota)

    // Cek siapa yang sudah punya persembahan perpuluhan di periode ini (anti-duplikat)
    const from = `${tahun}-${String(bulan).padStart(2, '0')}-01`
    const toDate = new Date(tahun, bulan, 1)
    const to = toDate.toISOString().slice(0, 10)
    const { data: existing } = await supabase.from('persembahan')
      .select('anggota_id').eq('kategori_id', kid).gte('tanggal', from).lt('tanggal', to).not('anggota_id', 'is', null)
    const existingIds = new Set((existing ?? []).map((r: any) => r.anggota_id))

    const dataRows = raw.slice(found.headerIdx + 1).filter(r => r && r[found.namaCol])
    const parsed: ParsedRow[] = dataRows.map(r => {
      const namaExcel = String(r[found.namaCol] ?? '').trim()
      const hpExcel = String(r[found.hpCol] ?? '').trim()
      const total = parseAmount(r[found.totalCol])
      const byPhone = normPhone(hpExcel) ? anggota.find(a => normPhone(a.kontak) === normPhone(hpExcel)) : undefined
      const byName = anggota.find(a => normName(a.nama) === normName(namaExcel))
      const match = byPhone ?? byName
      return {
        namaExcel, hpExcel, total,
        anggotaId: match?.id ?? null,
        sudahAda: match ? existingIds.has(match.id) : false,
        include: true,
      }
    })
    setRows(parsed)
    setStep('preview')
  }

  function setRowAnggota(idx: number, anggotaId: string) {
    setRows(rs => rs.map((r, i) => i === idx ? {
      ...r, anggotaId: anggotaId || null,
      sudahAda: false, // override manual -> biarkan admin yang putuskan, jangan asumsikan duplikat lagi
    } : r))
  }
  function toggleInclude(idx: number) {
    setRows(rs => rs.map((r, i) => i === idx ? { ...r, include: !r.include } : r))
  }

  async function buatAnggotaBaru(idx: number) {
    const row = rows[idx]
    const { data, error } = await supabase.from('anggota')
      .insert({ nama: row.namaExcel, kontak: row.hpExcel || null, wajib_perpuluhan: true })
      .select().single()
    if (error) { setMsg('Gagal buat anggota: ' + error.message); return }
    setAnggotaList(a => [...a, data as Anggota])
    setRowAnggota(idx, data.id)
  }

  const matchedCount = rows.filter(r => r.anggotaId && r.include).length
  const unmatchedCount = rows.filter(r => !r.anggotaId).length
  const totalImport = rows.filter(r => r.anggotaId && r.include).reduce((s, r) => s + r.total, 0)

  async function doImport() {
    const tanggal = `${tahun}-${String(bulan).padStart(2, '0')}-01`
    const toInsert = rows
      .filter(r => r.include && r.anggotaId && r.total > 0)
      .map(r => ({
        tanggal, kategori_id: kategoriId, anggota_id: r.anggotaId,
        jumlah: r.total, nama_pemberi: r.namaExcel,
        keterangan: `Import dari Excel (${fileName})`,
      }))
    if (toInsert.length === 0) { setMsg('Tidak ada baris yang siap diimpor.'); return }
    setSaving(true); setMsg('')
    const { error } = await supabase.from('persembahan').insert(toInsert)
    setSaving(false)
    if (error) { setMsg('Gagal impor: ' + error.message); return }
    onImported()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-lg mb-1">Import Perpuluhan dari Excel</h3>
        <p className="text-xs text-gray-500 mb-4">
          Periode tujuan: <b>{BULAN[bulan]} {tahun}</b> (ubah dulu di halaman utama bila perlu).
          File harus berisi kolom <b>Nama</b>, <b>No HP</b>, dan <b>Total</b>.
        </p>

        {step === 'pilih' && (
          <div>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-2xl py-10 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-colors">
              <span className="text-3xl">📄</span>
              <span className="text-sm font-medium text-gray-600">Klik untuk pilih file .xlsx</span>
              <input type="file" accept=".xlsx,.xls" className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </label>
            {parseError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{parseError}</p>}
            <div className="flex justify-end mt-5">
              <button onClick={onClose} className="border rounded-xl px-4 py-2 text-sm font-medium">Batal</button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div>
            <div className="flex items-center gap-3 mb-3 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium">{matchedCount} cocok</span>
              {unmatchedCount > 0 && <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">{unmatchedCount} belum cocok</span>}
              <span className="text-gray-400">{fileName}</span>
            </div>
            <div className="border rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>{['', 'Nama (Excel)', 'No HP', 'Total', 'Cocok dengan anggota'].map(h => <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r, i) => (
                    <tr key={i} className={!r.include ? 'opacity-40' : ''}>
                      <td className="px-3 py-2"><input type="checkbox" checked={r.include} onChange={() => toggleInclude(i)} /></td>
                      <td className="px-3 py-2">{r.namaExcel}{r.sudahAda && <span className="block text-[10px] text-amber-600">⚠ sudah ada di periode ini</span>}</td>
                      <td className="px-3 py-2 text-gray-500">{r.hpExcel || '-'}</td>
                      <td className="px-3 py-2 font-medium">{formatRupiah(r.total)}</td>
                      <td className="px-3 py-2">
                        <select value={r.anggotaId ?? ''} onChange={e => setRowAnggota(i, e.target.value)} className="border rounded-lg px-2 py-1 text-xs w-full max-w-[220px]">
                          <option value="">— tidak ditemukan —</option>
                          {anggotaList.map(a => <option key={a.id} value={a.id}>{a.nama}{a.kontak ? ` (${a.kontak})` : ''}</option>)}
                        </select>
                        {!r.anggotaId && (
                          <button onClick={() => buatAnggotaBaru(i)} className="block text-[11px] text-blue-700 hover:underline mt-1">+ Buat anggota baru</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-600">Akan diimpor: <b>{matchedCount}</b> baris · Total <b>{formatRupiah(totalImport)}</b></p>
            </div>
            {msg && <p className="text-xs mt-2 text-red-600 bg-red-50 rounded-lg px-3 py-2">{msg}</p>}

            <div className="flex gap-2 mt-5">
              <button onClick={() => setStep('pilih')} className="border rounded-xl px-4 py-2 text-sm font-medium">← Pilih file lain</button>
              <button onClick={onClose} className="flex-1 border rounded-xl py-2 text-sm font-medium">Batal</button>
              <button onClick={doImport} disabled={saving || matchedCount === 0} className="flex-1 bg-blue-700 text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-50">
                {saving ? 'Mengimpor…' : `Impor ${matchedCount} data`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
