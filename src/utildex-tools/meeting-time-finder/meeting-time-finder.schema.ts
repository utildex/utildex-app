import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const time24 = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const participant = z.object({
  zone: z.string().min(1),
  label: z.string().optional(),
  startTime: time24,
  endTime: time24,
  includeWeekends: z.boolean().optional(),
});

const slot = z.object({
  utcIso: z.string(),
  startMinutes: z.number().int(),
  perParticipant: z.array(
    z.object({
      zone: z.string(),
      date: z.string(),
      time: z.string(),
      offsetLabel: z.string(),
      abbreviation: z.string(),
      weekday: z.string(),
      isWorking: z.boolean(),
    }),
  ),
  overlapCount: z.number().int(),
  isFullOverlap: z.boolean(),
});

const overlapWindow = z.object({
  startUtcIso: z.string(),
  endUtcIso: z.string(),
  durationMinutes: z.number().int(),
  perParticipant: z.array(
    z.object({
      zone: z.string(),
      startDate: z.string(),
      startTime: z.string(),
      endDate: z.string(),
      endTime: z.string(),
    }),
  ),
});

export const schema = {
  input: z.object({
    date: isoDate,
    anchorZone: z.string().min(1),
    participants: z.array(participant).min(1),
    stepMinutes: z.number().int().positive().optional(),
  }),
  output: z.object({
    slots: z.array(slot),
    fullOverlapWindows: z.array(overlapWindow),
  }),
} as const;
