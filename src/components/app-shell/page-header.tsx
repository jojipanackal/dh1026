export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-10 flex items-start justify-between gap-4">
      <div className="relative pl-4">
        <span aria-hidden="true" className="page-header-rule absolute inset-y-1 left-0 w-0.5 rounded-full" />
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">
          Workspace
        </p>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
