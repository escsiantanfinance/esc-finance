'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase, formatRupiah, formatTanggal, type SesiIbadah, type SesiPecahan, type Persembahan, type Pengeluaran } from '@/lib/supabase'

export default function SesiDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [sesi, setSesi] = useState<SesiIbadah | null>(null)
  const [pecahan, setPecahan] = useState<SesiPecahan[]>([])
  const [persembahan, setPersembahan] = useState<Persembahan[]>([])
  const [pengeluaran, setPengeluaran] = useState<Pengeluaran[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: s }, { data: p }, { data: pers }, { data: peng }] = await Promise.all([
        supabase.from('sesi_ibadah').select('*, kas:kas_id(nama)').eq('id', id).single(),
        supabase.from('sesi_pecahan').select('*').eq('sesi_id', id).order('nominal', { ascending: false }),
        supabase.from('persembahan').select('*, kategori:kategori_id(nama)').eq('sesi_id', id),
        supabase.from('pengeluaran').select('*, kategori:kategori_id(nama,warna), kas:kas_id(nama)').eq('sesi_id', id),
      ])
      if (s) setSesi(s as any)
      if (p) setPecahan(p as any)
      if (pers) setPersembahan(pers as any)
      if (peng) setPengeluaran(peng as any)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <main className="flex-1 p-8 text-gray-400">Memuat...</main>
  if (!sesi) return <main className="flex-1 p-8 text-gray-400">Sesi tidak ditemukan.</main>

  const match = Number(sesi.selisih) === 0

  return (
    <main className="flex-1 p-8">
        <Link href="/sesi-ibadah" className="text-gray-500 text-sm hover:underline">← Kembali ke daftar sesi</Link>
        <div className="mt-3 mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{sesi.nama_sesi || sesi.jenis_ibadah} — {formatTanggal(sesi.tanggal)}</h1>
            <p className="text-gray-500 text-sm">{sesi.jenis_ibadah} · Kas tujuan: {sesi.kas?.nama ?? '-'} {sesi.jam ? `· ${sesi.jam.slice(0, 5)}` : ''}</p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-bold ${match ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {match ? '✓ MATCH' : '✗ MISMATCH'} — selisih {formatRupiah(sesi.selisih)}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Denominasi */}
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Kalkulator Denominasi (Fisik)</h3>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {pecahan.map(p => (
                  <tr key={p.id}><td className="py-2">{formatRupiah(p.nominal)} × {p.jumlah_lembar}</td><td className="py-2 text-right font-medium">{formatRupiah(p.subtotal)}</td></tr>
                ))}
                {pecahan.length === 0 && <tr><td className="py-3 text-gray-400">Belum ada data denominasi</td></tr>}
                <tr className="border-t-2 border-gray-200 font-bold"><td className="pt-2">Total Fisik</td><td className="pt-2 text-right">{formatRupiah(sesi.total_fisik)}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Kategori */}
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Kategori Persembahan</h3>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {persembahan.map(p => (
                  <tr key={p.id}><td className="py-2">{p.kategori?.nama ?? '-'}{p.nama_pemberi ? <span className="text-gray-400"> · {p.nama_pemberi}</span> : null}</td><td className="py-2 text-right font-medium">{formatRupiah(p.jumlah)}</td></tr>
                ))}
                {persembahan.length === 0 && <tr><td className="py-3 text-gray-400">Belum ada kategori</td></tr>}
                <tr className="border-t-2 border-gray-200 font-bold"><td className="pt-2">Total Kategori</td><td className="pt-2 text-right">{formatRupiah(sesi.total_kategori)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Kartu Biru — pengeluaran tunai dalam sesi + rekonsiliasi */}
        <div className="bg-white rounded-2xl shadow-sm border p-5 mt-5">
          <h3 className="font-semibold text-gray-700 mb-3">Kartu Biru — Pengeluaran Tunai</h3>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {pengeluaran.map(p => (
                <tr key={p.id}>
                  <td className="py-2">{p.keterangan}{p.penerima ? <span className="text-gray-400"> · {p.penerima}</span> : null}</td>
                  <td className="py-2 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.status === 'disetujui' ? 'bg-green-100 text-green-700' : p.status === 'ditolak' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{p.status}</span></td>
                  <td className="py-2 text-right font-medium text-red-600">{formatRupiah(p.jumlah)}</td>
                </tr>
              ))}
              {pengeluaran.length === 0 && <tr><td className="py-3 text-gray-400">Tidak ada pengeluaran tunai pada sesi ini</td></tr>}
              <tr className="border-t-2 border-gray-200 font-bold"><td className="pt-2" colSpan={2}>Total Pengeluaran</td><td className="pt-2 text-right text-red-600">{formatRupiah(sesi.total_pengeluaran)}</td></tr>
            </tbody>
          </table>
          <div className="mt-4 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600">
            Rekonsiliasi: Fisik <b>{formatRupiah(sesi.total_fisik)}</b> = Kategori <b>{formatRupiah(sesi.total_kategori)}</b> − Pengeluaran <b>{formatRupiah(sesi.total_pengeluaran)}</b> · selisih <b className={match ? 'text-green-600' : 'text-red-600'}>{formatRupiah(sesi.selisih)}</b>
          </div>
        </div>

        {/* Tanda tangan */}
        <div className="bg-white rounded-2xl shadow-sm border p-5 mt-5">
          <h3 className="font-semibold text-gray-700 mb-3">Otorisasi &amp; Tanda Tangan</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <SignBox label="Penghitung 1" nama={sesi.nama_penghitung1} url={sesi.ttd_penghitung1_url} />
            <SignBox label="Penghitung 2" nama={sesi.nama_penghitung2} url={sesi.ttd_penghitung2_url} />
            <SignBox label="Bendahara" nama={sesi.nama_bendahara} url={sesi.ttd_bendahara_url} />
            <SignBox label="Gembala" nama={sesi.nama_gembala} url={sesi.ttd_gembala_url} />
          </div>
          {sesi.status === 'signed_locked' && (
            <p className="text-green-600 text-sm font-medium mt-4">🔒 Data terkunci — sudah disinkronkan ke kas &amp; jurnal, tidak dapat diubah lagi
              {sesi.signed_at ? ` (${formatTanggal(sesi.signed_at)})` : ''}</p>
          )}
        </div>
    </main>
  )
}

function SignBox({ label, nama, url }: { label: string; nama?: string; url?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1.5">{label}{nama ? ` — ${nama}` : ''}</p>
      <div className="h-24 border border-dashed border-gray-300 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden">
        {url
          ? <img src={url} alt={`Tanda tangan ${label}`} className="max-h-full object-contain" />
          : <span className="text-gray-300 text-sm italic">Belum ada tanda tangan</span>}
      </div>
    </div>
  )
}
