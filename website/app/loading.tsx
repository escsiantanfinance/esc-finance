export default function Loading() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-24"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
      </div>

      <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
    </div>
  )
}
