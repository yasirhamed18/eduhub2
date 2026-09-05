'use client';

export function Loader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="loader">
      <div className="ring" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="empty-state">
      <span className="em">{icon}</span>
      <h3>{title}</h3>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}
