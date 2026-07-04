export default function Loading() {
  return (
    <div className="flex-1 p-6 lg:p-8 space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 bg-indigo-100/80 rounded-full w-56"></div>
        <div className="h-4 bg-indigo-50 rounded-full w-40"></div>
      </div>

      <div className="h-40 bg-indigo-100/70 rounded-2xl"></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-white border border-indigo-50 rounded-2xl"></div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="h-72 bg-white border border-indigo-50 rounded-2xl"></div>
        <div className="h-72 bg-white border border-indigo-50 rounded-2xl"></div>
      </div>
    </div>
  )
}
