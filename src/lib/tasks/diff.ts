export type FieldDiff = Record<string, { from: unknown; to: unknown }>;

export function diffTask<T extends Record<string, unknown>>(
  before: T,
  after: T,
  fields: readonly (keyof T & string)[],
): FieldDiff {
  const diff: FieldDiff = {};
  for (const field of fields) {
    if (!Object.is(before[field], after[field])) {
      diff[field] = { from: before[field], to: after[field] };
    }
  }
  return diff;
}
