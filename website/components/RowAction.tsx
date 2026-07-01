interface RowActionProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'default' | 'danger' | 'success'
  disabled?: boolean
  title?: string
}

const variantMap = {
  default: 'text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-100',
  danger:  'text-red-600 bg-red-50 hover:bg-red-100 border border-red-100',
  success: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100',
}

export function RowAction({ children, onClick, variant = 'default', disabled, title }: RowActionProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all duration-150
        ${variantMap[variant]} disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  )
}

export default RowAction
