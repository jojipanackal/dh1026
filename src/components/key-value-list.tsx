export function KeyValueList({
  items,
}: {
  items: { label: string; value: React.ReactNode }[];
}) {
  return (
    <dl className="flex flex-col gap-2 text-sm">
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline gap-4">
          <dt className="w-36 shrink-0 text-muted-foreground">{item.label}</dt>
          <dd className="min-w-0">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
