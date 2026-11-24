// metrix-core/frontend/src/lib/formatters.ts
/*
Purpose: Provides locale-aware date/time formatters and precision-safe monetary
formatting using Decimal.js.

Context: Enforces BR-012 / NFR-REL-02 (zero floating-point arithmetic for
monetary amounts) and NFR-I18N-01 (configurable locale, timezone, and currency).

Implementation Specs: Accepts backend fixed-scale decimal strings (NUMERIC(14,2))
and ISO-8601 UTC timestamps, formatting via Decimal.js and standard Intl APIs.
*/

import Decimal from "decimal.js";
import { publicEnv } from "@/config/env";

export interface FormatMoneyOptions {
  locale?: string;
  currency?: string;
}

export function formatDecimalMoney(
  decimalString: string,
  options: FormatMoneyOptions = {}
): string {
  const locale = options.locale ?? publicEnv.NEXT_PUBLIC_DEFAULT_LOCALE;
  const currency = options.currency ?? publicEnv.NEXT_PUBLIC_DEFAULT_CURRENCY;

  const value = new Decimal(decimalString);
  const fixed = value.toFixed(2);
  const isNegative = value.isNegative();
  const [rawInt = "0", frac = "00"] = fixed.replace("-", "").split(".");

  const formattedInt = new Intl.NumberFormat(locale, {
    useGrouping: true,
    maximumFractionDigits: 0,
  }).format(BigInt(rawInt));

  const symbol =
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value ?? currency;

  const sign = isNegative ? "-" : "";
  return `${sign}${symbol}${formattedInt}.${frac}`;
}

export function formatUtcTimestamp(
  isoTimestamp: string,
  options: { locale?: string; timeZone?: string } = {}
): string {
  const locale = options.locale ?? publicEnv.NEXT_PUBLIC_DEFAULT_LOCALE;
  const timeZone = options.timeZone ?? publicEnv.NEXT_PUBLIC_DEFAULT_TIMEZONE;

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone,
  }).format(new Date(isoTimestamp));
}
