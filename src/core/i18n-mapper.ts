type LocaleRecord = Record<string, unknown>;
type LocaleDictionary = Record<string, LocaleRecord>;

export function mapLocalizedField<
  T extends LocaleDictionary,
  K extends keyof T[keyof T] & string,
>(dictionary: T, key: K): Record<string, string> {
  return Object.fromEntries(
    Object.entries(dictionary).map(([lang, value]) => [lang, value[key] as string]),
  );
}

export function mapLocalizedNestedField<
  T extends LocaleDictionary,
  N extends keyof T[keyof T] & string,
  K extends keyof T[keyof T][N] & string,
>(dictionary: T, nestedKey: N, key: K): Record<string, string> {
  return Object.fromEntries(
    Object.entries(dictionary).map(([lang, value]) => {
      const nestedValue = value[nestedKey] as Record<string, string>;
      return [lang, nestedValue[key]];
    }),
  );
}
