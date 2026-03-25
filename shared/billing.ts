export interface BillingPeriod {
  start: Date;
  end: Date;
  startStr: string;
  endStr: string;
}

export function getBillingPeriod(billingStartDay: number, referenceDate: Date = new Date()): BillingPeriod {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const day = referenceDate.getDate();

  let periodStart: Date;
  let periodEnd: Date;

  if (day >= billingStartDay) {
    periodStart = new Date(year, month, billingStartDay);
    periodEnd = new Date(year, month + 1, billingStartDay - 1);
  } else {
    periodStart = new Date(year, month - 1, billingStartDay);
    periodEnd = new Date(year, month, billingStartDay - 1);
  }

  periodEnd.setHours(23, 59, 59, 999);

  return {
    start: periodStart,
    end: periodEnd,
    startStr: periodStart.toISOString().split('T')[0],
    endStr: periodEnd.toISOString().split('T')[0],
  };
}

export function getNextBillingPeriod(billingStartDay: number, currentPeriodStart: Date): BillingPeriod {
  const nextPeriodStart = new Date(currentPeriodStart);
  nextPeriodStart.setMonth(nextPeriodStart.getMonth() + 1);
  
  return getBillingPeriod(billingStartDay, nextPeriodStart);
}

export function isDateInBillingPeriod(date: Date, period: BillingPeriod): boolean {
  return date >= period.start && date <= period.end;
}

export function getRecurringTaskDueDate(recurrenceDay: number, period: BillingPeriod): Date {
  const year = period.start.getFullYear();
  const month = period.start.getMonth();
  
  let dueDate = new Date(year, month, recurrenceDay);
  
  if (dueDate < period.start) {
    dueDate = new Date(year, month + 1, recurrenceDay);
  }
  
  if (dueDate > period.end) {
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    dueDate = new Date(year, month, Math.min(recurrenceDay, lastDayOfMonth));
    if (dueDate < period.start) {
      dueDate = new Date(year, month + 1, Math.min(recurrenceDay, new Date(year, month + 2, 0).getDate()));
    }
  }
  
  return dueDate;
}

export function formatBillingPeriod(period: BillingPeriod): string {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${period.start.toLocaleDateString('en-US', options)} - ${period.end.toLocaleDateString('en-US', options)}`;
}

/**
 * Get the nth occurrence of a weekday in a given month
 * @param year - The year
 * @param month - The month (0-11)
 * @param weekday - Day of week (0 = Sunday, 6 = Saturday)
 * @param ordinal - Which occurrence (1-4 for 1st-4th, -1 for last)
 */
export function getNthWeekdayOfMonth(year: number, month: number, weekday: number, ordinal: number): Date | null {
  if (ordinal === -1) {
    // Last occurrence of the weekday
    const lastDay = new Date(year, month + 1, 0);
    const lastDayOfWeek = lastDay.getDay();
    let daysToSubtract = lastDayOfWeek - weekday;
    if (daysToSubtract < 0) daysToSubtract += 7;
    return new Date(year, month, lastDay.getDate() - daysToSubtract);
  }
  
  // Find first occurrence of weekday in month
  const firstDay = new Date(year, month, 1);
  const firstDayOfWeek = firstDay.getDay();
  let daysToAdd = weekday - firstDayOfWeek;
  if (daysToAdd < 0) daysToAdd += 7;
  
  // Calculate nth occurrence
  const day = 1 + daysToAdd + (ordinal - 1) * 7;
  const result = new Date(year, month, day);
  
  // Check if result is still in the same month
  if (result.getMonth() !== month) {
    return null; // No such occurrence (e.g., 5th Tuesday doesn't exist)
  }
  
  return result;
}

/**
 * Get the due date for a day_of_week recurring task within a billing period
 * Finds the first valid nth weekday occurrence that falls within [period.start, period.end]
 */
export function getWeekdayRecurringTaskDueDate(weekday: number, ordinal: number, period: BillingPeriod): Date {
  // Collect candidates from the months that might overlap with the billing period
  const candidates: Date[] = [];
  
  // Start from the month of period.start and check up to 2 months ahead
  const startYear = period.start.getFullYear();
  const startMonth = period.start.getMonth();
  
  for (let offset = 0; offset <= 2; offset++) {
    const checkDate = new Date(startYear, startMonth + offset, 1);
    const candidate = getNthWeekdayOfMonth(checkDate.getFullYear(), checkDate.getMonth(), weekday, ordinal);
    if (candidate) {
      candidates.push(candidate);
    }
  }
  
  // Find the first candidate that falls within the billing period
  for (const candidate of candidates) {
    if (candidate >= period.start && candidate <= period.end) {
      return candidate;
    }
  }
  
  // If no candidate is within the period, return the first candidate after period.start
  for (const candidate of candidates) {
    if (candidate >= period.start) {
      return candidate;
    }
  }
  
  // Fallback to period.start if nothing found
  return period.start;
}

/**
 * Get the next biweekly occurrence of a weekday
 */
export function getNextBiweeklyDate(weekday: number, referenceDate: Date = new Date()): Date {
  const result = new Date(referenceDate);
  const currentDay = result.getDay();
  
  // Find next occurrence of this weekday
  let daysUntilNext = weekday - currentDay;
  if (daysUntilNext <= 0) {
    daysUntilNext += 7;
  }
  
  result.setDate(result.getDate() + daysUntilNext);
  return result;
}

/**
 * Get the due date for a biweekly recurring task
 */
export function getBiweeklyRecurringTaskDueDate(weekday: number, period: BillingPeriod): Date {
  // Find the first occurrence of the weekday within or after the period start
  let dueDate = new Date(period.start);
  const currentDay = dueDate.getDay();
  
  let daysUntilNext = weekday - currentDay;
  if (daysUntilNext < 0) daysUntilNext += 7;
  
  dueDate.setDate(dueDate.getDate() + daysUntilNext);
  
  return dueDate;
}
