import { z } from 'zod';

const recurrenceFreq = z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']);

export const schema = {
  input: z.object({
    title: z.string(),
    description: z.string().optional(),
    location: z.string().optional(),
    url: z.string().optional(),
    organizerName: z.string().optional(),
    organizerEmail: z.string().optional(),
    /** Start wall-clock date (YYYY-MM-DD). */
    startDate: z.string(),
    /** Start wall-clock time (HH:MM); ignored when allDay=true. */
    startTime: z.string().optional(),
    /** End wall-clock date (YYYY-MM-DD). */
    endDate: z.string(),
    /** End wall-clock time (HH:MM); ignored when allDay=true. */
    endTime: z.string().optional(),
    allDay: z.boolean().optional(),
    /** IANA zone for the event start/end (used to emit TZID + VTIMEZONE). */
    zone: z.string().optional(),
    recurrence: recurrenceFreq.optional(),
    /** Optional recurrence interval (default 1). */
    recurrenceInterval: z.number().int().min(1).max(99).optional(),
    /** Optional max occurrences (mutually exclusive with `recurrenceUntil`). */
    recurrenceCount: z.number().int().min(1).max(999).optional(),
    /** Optional recurrence end date (YYYY-MM-DD). */
    recurrenceUntil: z.string().optional(),
    /** Reminder alarms, minutes before start. */
    remindersMinutes: z.array(z.number().int().min(0).max(40320)).optional(),
    /** Status: CONFIRMED (default), TENTATIVE, CANCELLED. */
    status: z.enum(['CONFIRMED', 'TENTATIVE', 'CANCELLED']).optional(),
  }),
  output: z.object({
    valid: z.boolean(),
    error: z.string().nullable(),
    ics: z.string().nullable(),
    filename: z.string().nullable(),
    /** Echo of resolved/normalized fields, useful for previewing. */
    summary: z
      .object({
        title: z.string(),
        startInstantMs: z.number(),
        endInstantMs: z.number(),
        zone: z.string(),
        allDay: z.boolean(),
        durationMinutes: z.number(),
        rruleHuman: z.string().nullable(),
      })
      .nullable(),
  }),
} as const;
