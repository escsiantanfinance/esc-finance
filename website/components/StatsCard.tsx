import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string
  subtitle?: string
  trend?: 'up' | 'down' | 'flat'
  color?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'violet'
  icon: React.ElementType
}

const colorMap = {
  indigo: {
    bg:    'from-indigo-500 to-indigo-600',
    light: 'bg-indigo-50',
    text:  'text-indigo-600',
    icon:  'bg-indigo-500/20 text-indigo-100',
    val:   'text-indigo-900',
  },
  emerald: {
    bg:    'from-emerald-500 to-teal-600',
    light: 'bg-emerald-50',
    text:  'text-emerald-600',
    icon:  'bg-emerald-500/20 text-emerald-100',
    val:   'text-emerald-900',
  },
  rose: {
    bg:    'from-rose-500 to-red-600',
    light: 'bg-rose-50',
    text:  'text-rose-600',
    icon:  'bg-rose-500/20 text-rose-100',
    val:   'text-rose-900',
  },
  amber: {
    bg:    'from-amber-400 to-orange-500',
    light: 'bg-amber-50',
    text:  'text-amber-600',
    icon:  'bg-amber-500/20 text-amber-100',
    val:   'text-amber-900',
  },
  violet: {
    bg:    'from-violet-500 to-purple-600',
    light: 'bg-violet-50',
    text:  'text-violet-600',
    icon:  'bg-violet-500/20 text-violet-100',
    val:   'text-violet-900',
  },
}

const TrendIcon = ({ trend }: { trend?: 'up' | 'down' | 'flat' }) => {
  if (!trend) return null
  if (trend === 'up') return <TrendingUp className="w-3.5 h-3.5" />
  if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5" />
  return <Minus className="w-3.5 h-3.5" />
}

export default function StatsCard({ title, value, subtitle, trend, color = 'indigo', icon: Icon }: StatsCardProps) {
  const c = colorMap[color]
  return (
    <div className="relative bg-white rounded-2xl overflow-hidden shadow-card border border-indigo-50 hover:shadow-soft hover:-translate-y-0.5 transition-all duration-200">
      {/* Top color strip */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${c.bg}`} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide leading-tight">{title}</p>
          <div className={`grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br ${c.bg}`}>
            <Icon className="w-[18px] h-[18px] text-white" strokeWidth={2} />
          </div>
        </div>
        <p className={`text-2xl font-extrabold tracking-tight tabular-nums ${c.val} leading-none`}>{value}</p>
        {(subtitle || trend) && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${c.text}`}>
            <TrendIcon trend={trend} />
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  )
}
