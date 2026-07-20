export function parseListInput(value: string): string[] {
  return value.split(/,|\n/).map((item) => item.trim()).filter(Boolean);
}

export function updateListDraft(raw: string): { raw: string; values: string[] } {
  return { raw, values: parseListInput(raw) };
}

export function formatListInput(values: string[], multiline = false): string {
  return values.join(multiline ? "\n" : ", ");
}
