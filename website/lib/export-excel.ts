import * as XLSX from 'xlsx'

// Utilitas export data ke Excel (.xlsx) langsung di browser.
// Dipakai tombol "Export Excel" di halaman data/laporan — jalur ini
// berbeda dari modul Backup (server, terenkripsi) yang untuk disaster recovery.
export function exportToExcel(
  rows: Record<string, any>[],
  filename: string,
  sheetName = 'Data'
) {
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Info: 'Tidak ada data' }])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))
  const stamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `${filename}_${stamp}.xlsx`)
}

// Export beberapa sheet sekaligus
export function exportSheets(
  sheets: { name: string; rows: Record<string, any>[] }[],
  filename: string
) {
  const wb = XLSX.utils.book_new()
  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.rows.length ? s.rows : [{ Info: 'Tidak ada data' }])
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31))
  }
  const stamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `${filename}_${stamp}.xlsx`)
}
