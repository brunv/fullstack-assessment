import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
};

export function EmptyState({ icon: Icon, title, subtitle, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] px-6 py-16 text-center">
      <Icon size={40} className="text-[var(--color-ink-faint)]" />
      <p className="mt-4 text-base font-semibold text-[var(--color-ink)]">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-[var(--color-ink-muted)]">{subtitle}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
