import type { z } from 'zod';
import { schema } from './unit-converter.schema';

export type UnitType = 'length' | 'weight' | 'temp';

export interface UnitDef {
  id: string;
  labelKey: string;
  factor: number;
}

export const ALL_UNITS: (UnitDef & { type: UnitType })[] = [
  { id: 'meter', type: 'length', labelKey: 'UNIT_METER', factor: 1 },
  { id: 'kilometer', type: 'length', labelKey: 'UNIT_KILOMETER', factor: 1000 },
  { id: 'centimeter', type: 'length', labelKey: 'UNIT_CENTIMETER', factor: 0.01 },
  { id: 'foot', type: 'length', labelKey: 'UNIT_FOOT', factor: 0.3048 },
  { id: 'inch', type: 'length', labelKey: 'UNIT_INCH', factor: 0.0254 },
  { id: 'mile', type: 'length', labelKey: 'UNIT_MILE', factor: 1609.34 },
  { id: 'gram', type: 'weight', labelKey: 'UNIT_GRAM', factor: 1 },
  { id: 'kilogram', type: 'weight', labelKey: 'UNIT_KILOGRAM', factor: 1000 },
  { id: 'pound', type: 'weight', labelKey: 'UNIT_POUND', factor: 453.592 },
  { id: 'ounce', type: 'weight', labelKey: 'UNIT_OUNCE', factor: 28.3495 },
  { id: 'celsius', type: 'temp', labelKey: 'UNIT_CELSIUS', factor: 1 },
  { id: 'fahrenheit', type: 'temp', labelKey: 'UNIT_FAHRENHEIT', factor: 1 },
  { id: 'kelvin', type: 'temp', labelKey: 'UNIT_KELVIN', factor: 1 },
];

export function convertTemp(val: number, from: string, to: string): number {
  let celsius = val;
  if (from === 'fahrenheit') celsius = ((val - 32) * 5) / 9;
  if (from === 'kelvin') celsius = val - 273.15;

  if (to === 'celsius') return celsius;
  if (to === 'fahrenheit') return (celsius * 9) / 5 + 32;
  if (to === 'kelvin') return celsius + 273.15;
  return celsius;
}

export function convertUnits(
  amount: number,
  fromId: string,
  toId: string,
  type: UnitType,
  units: (UnitDef & { type: UnitType })[] = ALL_UNITS,
): number {
  if (type === 'temp') {
    return convertTemp(amount, fromId, toId);
  }

  const fromDef = units.find((u) => u.id === fromId);
  const toDef = units.find((u) => u.id === toId);
  if (!fromDef || !toDef) return 0;

  const base = amount * fromDef.factor;
  return base / toDef.factor;
}

export function run(
  input: z.infer<typeof schema.input>,
): z.infer<typeof schema.output> {
  return { result: convertUnits(input.amount, input.from, input.to, input.type) };
}
