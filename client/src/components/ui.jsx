/**
 * PlaySphere shared UI components.
 * All components use CSS variables from index.css (design tokens).
 */

/* ── Button ──────────────────────────────────────────────────── */
export function PsButton({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  onClick,
  ...props
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-full transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-base',
  };
  const variants = {
    primary: 'bg-maroon text-white shadow-sm',
    secondary: 'border border-border text-primary bg-surface hover:bg-pill-hover',
    ghost: 'text-primary hover:bg-pill-hover',
    danger: 'bg-error text-white shadow-sm',
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/* ── Card ──────────────────────────────────────────────────────── */
export function PsCard({ children, className = '', ...props }) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface shadow-sm ${className}`}
      style={{ background: 'var(--surface)' }}
      {...props}
    >
      {children}
    </div>
  );
}

/* ── Input ──────────────────────────────────────────────────────── */
export function PsInput({ label, id, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-primary">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full rounded-xl border border-border bg-surface text-primary placeholder-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/40 transition ${error ? 'border-error' : ''} ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
}

/* ── Textarea ──────────────────────────────────────────────────── */
export function PsTextarea({ label, id, error, rows = 4, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-primary">
          {label}
        </label>
      )}
      <textarea
        id={id}
        rows={rows}
        className={`w-full rounded-xl border border-border bg-surface text-primary placeholder-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/40 transition resize-none ${error ? 'border-error' : ''} ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
}

/* ── Select ──────────────────────────────────────────────────────── */
export function PsSelect({ label, id, error, children, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-primary">
          {label}
        </label>
      )}
      <select
        id={id}
        className={`w-full rounded-xl border border-border bg-surface text-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/40 transition ${error ? 'border-error' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
}

/* ── Badge ──────────────────────────────────────────────────────── */
export function PsBadge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-pill-hover text-secondary',
    success: 'bg-success/10 text-success',
    warning: 'bg-gold/10 text-gold',
    danger: 'bg-error/10 text-error',
    maroon: 'bg-maroon text-white',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

/* ── Alert ──────────────────────────────────────────────────────── */
export function PsAlert({ children, variant = 'error', className = '' }) {
  const variants = {
    error: 'bg-error/10 border border-error/20 text-error',
    success: 'bg-success/10 border border-success/20 text-success',
    warning: 'bg-gold/10 border border-gold/20 text-gold',
    info: 'bg-maroon/10 border border-maroon/20 text-maroon',
  };
  return (
    <div className={`rounded-xl px-4 py-3 text-sm ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
}

/* ── PageHeader ──────────────────────────────────────────────────── */
export function PsPageHeader({ title, subtitle, actions, backTo, backLabel = 'Back' }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
      <div className="flex flex-col gap-1">
        {backTo && (
          <a
            href={backTo}
            onClick={e => { e.preventDefault(); window.history.back(); }}
            className="text-xs text-secondary hover:text-primary transition flex items-center gap-1 mb-1"
          >
            ← {backLabel}
          </a>
        )}
        <h1 className="text-2xl font-serif font-semibold text-primary">{title}</h1>
        {subtitle && <p className="text-sm text-secondary">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/* ── Loading State ──────────────────────────────────────────────── */
export function PsLoading({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-border border-t-maroon animate-spin" />
      <p className="text-sm text-secondary">{message}</p>
    </div>
  );
}

/* ── Empty State ──────────────────────────────────────────────────── */
export function PsEmpty({ title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="w-14 h-14 rounded-full border-2 border-dashed border-border flex items-center justify-center text-2xl">
        🏟
      </div>
      <h3 className="font-serif font-semibold text-primary">{title}</h3>
      {message && <p className="text-sm text-secondary max-w-xs">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* ── Error State ──────────────────────────────────────────────────── */
export function PsErrorState({ message = 'Something went wrong.', retry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center text-2xl">⚠️</div>
      <p className="text-sm text-error">{message}</p>
      {retry && (
        <PsButton variant="secondary" size="sm" onClick={retry}>
          Try again
        </PsButton>
      )}
    </div>
  );
}

/* ── Back Button ──────────────────────────────────────────────────── */
export function PsBackButton({ label = 'Back', onClick }) {
  return (
    <button
      type="button"
      onClick={onClick || (() => window.history.back())}
      className="text-sm text-secondary hover:text-primary transition flex items-center gap-1 mb-4"
    >
      ← {label}
    </button>
  );
}
