'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Catatan kecil utk bendahara: jelaskan bahwa data yang tampil sudah
// dipersempit ke kas yang diberi akses padanya — supaya tidak terlihat
// seperti data hilang/bug saat ia tidak melihat transaksi kas lain.
export default function ScopeBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setShow(data?.role === 'bendahara')
    }
    check()
  }, [])

  if (!show) return null
  return (
    <div className="mb-4 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
      📍 Menampilkan data dari kas yang diberi akses untuk Anda saja. Hubungi Super Admin bila ada kas yang seharusnya terlihat.
    </div>
  )
}
