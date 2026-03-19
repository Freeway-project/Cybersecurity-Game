export function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    return "";
  }

  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()),
  );

  const escapeValue = (value: unknown) => {
    const normalized =
      value instanceof Date
        ? value.toISOString()
        : typeof value === "object" && value !== null
          ? JSON.stringify(value)
          : String(value ?? "");

    if (
      normalized.includes(",") ||
      normalized.includes('"') ||
      normalized.includes("\n")
    ) {
      return `"${normalized.replaceAll('"', '""')}"`;
    }

    return normalized;
  };

  return [headers.join(","), ...rows.map((row) => headers.map((header) => escapeValue(row[header])).join(","))].join("\n");
}
