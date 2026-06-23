'use client'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { supabase, formatTanggal, type LogBackup } from '@/lib/supabase'

function fmtSize(b?: number) { if (!b) return '-'; return (b / 1024 / 1024).toFixed(1) + ' MB' }

export default function BackupPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [logs, setLogs] = useState<LogBackup[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [preview, setPreview] = useState<Record<string, number> | null>(null)
  const [file, setFile] = useState<File | null>(null)

  async function loadLogs() {
    const { data } = await supabase.from('log_backup').select('*').order('created_at', { ascending: false }).limit(30)
    setLogs(data ?? [])
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setAllowed(false); return }
      const { data: p } = await supabase.from('profiles').select('is_super_admin').eq('id', user.id).single()
      setAllowed(!!p?.is_super_admin)
      if (p?.is_super_admin) loadLogs()
    }
    init()
  }, [])

  async function triggerBackup() {
    setBusy(true); setMsg('')
    const res = await fetch('/api/backup/create', { method: 'POST' })
    const json = await res.json()
    setBusy(false)
    setMsg(res.ok ? `✓ Pencadangan berhasil (${fmtSize(json.size)})` : `✗ ${json.error}`)
    loadLogs()
  }

  async function doRestore(confirm: boolean) {
    if (!file) { setMsg('Pilih file .xlsx dulu'); return }
    setBusy(true); setMsg('')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('confirm', String(confirm))
    const res = await fetch('/api/backup/restore', { method: 'POST', body: fd })
    const json = await res.json()
    setBusy(false)
    if (!res.ok) { setMsg(`✗ ${json.error}`); return }
    if (json.mode === 'preview') { setPreview(json.preview); setMsg('Tinjau jumlah data di bawah, lalu konfirmasi.') }
    else { setPreview(null); setFile(null); setMsg('✓ Data berhasil dipulihkan'); loadLogs() }
  }

  if (allowed === null) return <div className="flex min-h-screen bg-gray-50"><Sidebar /><main className="flex-1 p-8 text-gray-400">Memuat...</main></div>
  if (!allowed) return (
    <div className="flex min-h-screen bg-gray-50"><Sidebar />
      <main className="flex-1 p-8"><div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 max-w-lg">
        <h1 className="font-bold text-lg text-amber-800">🔒 Akses dibatasi</h1>
        <p className="text-amber-700 text-sm mt-1">Halaman Backup &amp; Recovery hanya untuk Super Admin / Gembala Senior.</p>
      </div></main>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Backup &amp; Recovery</h1>
            <p className="text-gray-500 mt-1">Pencadangan otomatis harian &amp; pemulihan data</p>
          </div>
          <button onClick={triggerBackup} disabled={busy} className="bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white rounded-xl px-4 py-2.5 text-sm font-semibold">
            {busy ? 'Memproses…' : '🔄 Picu pencadangan sekarang'}
          </button>
        </div>

        {msg && <div className="mb-4 text-sm bg-white border rounded-xl px-4 py-2.5">{msg}</div>}

        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-6">
          <div className="px-5 py-3 border-b bg-gray-50"><h2 className="font-semibold text-gray-700">Riwayat pencadangan</h2></div>
          <table className="w-full text-sm">
            <thead className="bg-white border-b"><tr>{['Tanggal', 'Tipe', 'Ukuran', 'Status', 'Pelaksana'].map(h => <th key={h} className="text-left px-5 py-2.5 font-semibold text-gray-500 text-xs">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {logs.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-gray-400">Belum ada pencadangan</td></tr> :
                logs.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-5 py-2.5">{formatTanggal(l.created_at)}</td>
                    <td className="px-5 py-2.5 capitalize">{l.tipe}</td>
                    <td className="px-5 py-2.5">{fmtSize(l.ukuran_bytes)}</td>
                    <td className="px-5 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${l.status === 'sukses' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{l.status}</span>
                    </td>
                    <td className="px-5 py-2.5 text-gray-500">{l.pelaksana ?? '-'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 px-5 py-3">Retensi: 30 cadangan harian + 12 cadangan bulanan · disimpan terenkripsi (AES-256) di Storage terpisah.</p>
        </div>

        {/* Restore */}
        <div className="bg-white rounded-2xl border border-dashed p-5 max-w-xl">
          <h3 className="font-semibold text-gray-700">Pulihkan data dari Excel</h3>
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 my-2 inline-block">🔒 Khusus Super Admin — tinjau pratinjau sebelum konfirmasi</p>
          <input type="file" accept=".xlsx" onChange={e => { setFile(e.target.files?.[0] ?? null); setPreview(null) }} className="block text-sm my-2" />
          {preview && (
            <div className="text-xs bg-gray-50 rounded-xl p-3 my-2 grid grid-cols-2 gap-1">
              {Object.entries(preview).map(([t, n]) => <div key={t}><b>{n}</b> baris · {t}</div>)}
            </div>
          )}
          <div className="flex gap-2 mt-2">
            <button onClick={() => doRestore(false)} disabled={busy || !file} className="border border-gray-300 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">Pratinjau</button>
            {preview && <button onClick={() => doRestore(true)} disabled={busy} className="bg-red-600 text-white rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50">Konfirmasi pulihkan</button>}
          </div>
        </div>
      </main>
    </div>
  )
}
