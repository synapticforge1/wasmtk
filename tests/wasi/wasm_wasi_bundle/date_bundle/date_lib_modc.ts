// Tier-1 stdlib capability — Date (UTC integer calendar math) as a modc *leaf* library.
//
// Part of the on-demand stdlib bundling track (wasmtk-stdlib-bundling-brief §5/§7-#3).
// Unlike Set/Map (shared-heap, hold live structures the program touches), Date is a *leaf*
// capability: pure value-in / value-out integer math with NO heap allocation. It carries no
// $__malloc and no mutable state, so the wasmmerge splice is a straight function merge (the
// Stage 0.6 allocator-unification pass is a no-op here — nothing to unify).
//
// All routines are UTC and operate on a day-count: days since the Unix epoch 1970-01-01
// (can be negative for earlier dates). The civil<->days conversions use Howard Hinnant's
// branch-light algorithms (http://howardhinnant.github.io/date_algorithms.html), which are
// exact integer math valid across the entire proleptic Gregorian calendar.
//
// Integer division: every quotient that must truncate toward zero is `i32.div(a, b)` (wasMath),
// which is `i32.div_s` in wasm and the same truncation in TypeScript. (It was `(a / b) | 0`; since
// 2026-10-09 a plain `/` between integers is a compile error.) For all realistic inputs the
// dividends here are non-negative, so truncation == floor and the round-trips are exact.

import { i32 } from "../../../../src/wasmath.ts";

/** 1 if `year` is a Gregorian leap year, else 0. */
/** @export */
export function isLeapYear(year: i32): i32 {
  if ((year % 4) !== 0) return 0;
  if ((year % 100) !== 0) return 1;
  return (year % 400) === 0 ? 1 : 0;
}

/** Number of days in `month` (1-12) of `year`, accounting for leap February. */
/** @export */
export function daysInMonth(year: i32, month: i32): i32 {
  if (month === 2) {
    return isLeapYear(year) === 1 ? 29 : 28;
  }
  // April, June, September, November have 30 days.
  if (month === 4 || month === 6 || month === 9 || month === 11) {
    return 30;
  }
  return 31;
}

/** Days since 1970-01-01 for the civil date (year, month 1-12, day 1-31). May be negative. */
/** @export */
export function daysFromCivil(year: i32, month: i32, day: i32): i32 {
  const y: i32 = month <= 2 ? year - 1 : year;
  const era: i32 = i32.div(y >= 0 ? y : y - 399, 400);
  const yoe: i32 = y - era * 400;               // [0, 399]
  const mp: i32 = month > 2 ? month - 3 : month + 9; // [0, 11]
  const doy: i32 = i32.div(153 * mp + 2, 5) + day - 1; // [0, 365]
  const doe: i32 = yoe * 365 + i32.div(yoe, 4) - i32.div(yoe, 100) + doy; // [0, 146096]
  return era * 146097 + doe - 719468;
}

/** Day of week for a day-count: 0 = Sunday … 6 = Saturday. */
/** @export */
export function weekdayFromDays(z: i32): i32 {
  return z >= -4 ? ((z + 4) % 7) : (((z + 5) % 7) + 6);
}

/** Civil year for a day-count (days since 1970-01-01). */
/** @export */
export function yearFromDays(z: i32): i32 {
  const zz: i32 = z + 719468;
  const era: i32 = i32.div(zz >= 0 ? zz : zz - 146096, 146097);
  const doe: i32 = zz - era * 146097;           // [0, 146096]
  const a: i32 = i32.div(doe, 1460);
  const b: i32 = i32.div(doe, 36524);
  const c: i32 = i32.div(doe, 146096);
  const yoe: i32 = i32.div(doe - a + b - c, 365); // [0, 399]
  const y: i32 = yoe + era * 400;
  const doy: i32 = doe - (365 * yoe + i32.div(yoe, 4) - i32.div(yoe, 100)); // [0, 365]
  const mp: i32 = i32.div(5 * doy + 2, 153);     // [0, 11]
  const m: i32 = mp < 10 ? mp + 3 : mp - 9;      // [1, 12]
  return m <= 2 ? y + 1 : y;
}

/** Civil month (1-12) for a day-count (days since 1970-01-01). */
/** @export */
export function monthFromDays(z: i32): i32 {
  const zz: i32 = z + 719468;
  const era: i32 = i32.div(zz >= 0 ? zz : zz - 146096, 146097);
  const doe: i32 = zz - era * 146097;
  const a: i32 = i32.div(doe, 1460);
  const b: i32 = i32.div(doe, 36524);
  const c: i32 = i32.div(doe, 146096);
  const yoe: i32 = i32.div(doe - a + b - c, 365);
  const doy: i32 = doe - (365 * yoe + i32.div(yoe, 4) - i32.div(yoe, 100));
  const mp: i32 = i32.div(5 * doy + 2, 153);
  return mp < 10 ? mp + 3 : mp - 9;
}

/** Civil day-of-month (1-31) for a day-count (days since 1970-01-01). */
/** @export */
export function dayFromDays(z: i32): i32 {
  const zz: i32 = z + 719468;
  const era: i32 = i32.div(zz >= 0 ? zz : zz - 146096, 146097);
  const doe: i32 = zz - era * 146097;
  const a: i32 = i32.div(doe, 1460);
  const b: i32 = i32.div(doe, 36524);
  const c: i32 = i32.div(doe, 146096);
  const yoe: i32 = i32.div(doe - a + b - c, 365);
  const doy: i32 = doe - (365 * yoe + i32.div(yoe, 4) - i32.div(yoe, 100));
  const mp: i32 = i32.div(5 * doy + 2, 153);
  return doy - i32.div(153 * mp + 2, 5) + 1;
}
