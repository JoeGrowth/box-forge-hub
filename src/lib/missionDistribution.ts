// Mission distribution pages are `distribution_records` rows whose `kind` is
// `<folderId>:model-<modelId>`: the folder must belong to the organization and
// the record must have been created from a distribution model. Legacy kinds
// ("event", "consulting") and folder-to-folder kinds are not mission pages.

export type MissionDistributionRecord = { kind?: string | null };

export function isMissionDistributionPage(
  kind: string | null | undefined,
  folderIds: readonly string[],
): boolean {
  const k = String(kind ?? "");
  const separator = k.indexOf(":");
  if (separator <= 0) return false;
  const folder = k.slice(0, separator);
  const rest = k.slice(separator + 1);
  return folderIds.includes(folder) && rest.startsWith("model-");
}

export function countMissionDistributionPages(
  records: readonly MissionDistributionRecord[],
  folderIds: readonly string[],
): number {
  const ids = Array.from(new Set(folderIds.filter(Boolean)));
  if (ids.length === 0) return 0;
  return records.filter((r) => isMissionDistributionPage(r.kind, ids)).length;
}
