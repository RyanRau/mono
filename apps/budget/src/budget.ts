// Pure budgeting logic: no React, no PocketBase. Everything money-valued is
// integer cents; every date is a "YYYY-MM-DD" string (see the migration in
// apps/pocketbase/pb_migrations/1789200000_budget_collections.js for why).

export type Rule = "fixed" | "percent" | "remainder" | "none";

export type Settings = {
  id: string;
  pay_anchor_date: string;
  pay_interval_days: number;
  first_contribution: number;
  regular_contribution: number;
};

export type Bucket = {
  id: string;
  name: string;
  rule: Rule;
  /** Cents for "fixed", a percent for "percent", unused otherwise. */
  rule_value: number;
  /** Cents; 0 means no goal. */
  goal: number;
  sort: number;
  archived: boolean;
};

/** A signed change to one bucket's balance. `bucket: ""` is the unallocated pool. */
export type Split = { bucket: string; amount: number };

export type Kind = "deposit" | "withdrawal" | "transfer";

export type Transaction = {
  id: string;
  date: string;
  kind: Kind;
  amount: number;
  splits: Split[];
  note: string;
  created: string;
};

export const UNALLOCATED = "";

// ---------------------------------------------------------------- money

const dollars = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });
const wholeDollars = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export const formatMoney = (cents: number) => dollars.format(cents / 100);
/** For chart axes, where cents are noise. */
export const formatMoneyShort = (cents: number) => wholeDollars.format(cents / 100);
export const formatSigned = (cents: number) => (cents > 0 ? "+" : "") + formatMoney(cents);
export const toCents = (dollarsValue: number | null) => Math.round((dollarsValue ?? 0) * 100);
export const toDollars = (cents: number) => cents / 100;

// ---------------------------------------------------------------- dates

const DAY_MS = 86_400_000;

/** Days since the epoch, for date arithmetic without time zones. */
export function dayNumber(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function fromDayNumber(n: number): string {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

export const addDays = (date: string, days: number) => fromDayNumber(dayNumber(date) + days);

/** Today in the viewer's own zone. */
export function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

const asUtcDate = (date: string) => new Date(dayNumber(date) * DAY_MS);

export function formatDate(date: string, opts: { year?: boolean } = {}): string {
  const showYear = opts.year ?? date.slice(0, 4) !== today().slice(0, 4);
  return asUtcDate(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: showYear ? "numeric" : undefined,
    timeZone: "UTC",
  });
}

export function formatMonth(date: string): string {
  return asUtcDate(date).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// ---------------------------------------------------------------- paydays

/** Every payday in (after, through], ascending. */
export function paydaysBetween(settings: Settings, after: string, through: string): string[] {
  const anchor = dayNumber(settings.pay_anchor_date);
  const step = Math.max(1, settings.pay_interval_days);
  const start = dayNumber(after) + 1;
  const end = dayNumber(through);
  let n = anchor + Math.ceil((start - anchor) / step) * step;
  const out: string[] = [];
  for (; n <= end; n += step) out.push(fromDayNumber(n));
  return out;
}

export function isPayday(settings: Settings, date: string): boolean {
  const diff = dayNumber(date) - dayNumber(settings.pay_anchor_date);
  return diff % Math.max(1, settings.pay_interval_days) === 0;
}

/** True when the previous payday fell in an earlier month. */
export function isFirstPaydayOfMonth(settings: Settings, date: string): boolean {
  return addDays(date, -settings.pay_interval_days).slice(0, 7) !== date.slice(0, 7);
}

/** How much goes into savings on a given payday. */
export function contributionFor(settings: Settings, date: string): number {
  return isFirstPaydayOfMonth(settings, date)
    ? settings.first_contribution
    : settings.regular_contribution;
}

// ---------------------------------------------------------------- allocation

/** Buckets that take part in automatic splits, in priority order. */
export function activeBuckets(buckets: Bucket[]): Bucket[] {
  return buckets.filter((b) => !b.archived).sort((a, b) => a.sort - b.sort);
}

/**
 * Split a deposit across buckets by their rules:
 *   1. fixed buckets take their amount, in sort order, while money lasts;
 *   2. percent buckets take their percent of the *whole* deposit;
 *   3. remainder buckets share whatever's left evenly;
 *   4. anything still left goes to the unallocated pool.
 * Returns positive splits, omitting zeros. Always sums to `amount`.
 */
export function allocate(amount: number, buckets: Bucket[]): Split[] {
  const active = activeBuckets(buckets);
  const shares = new Map<string, number>();
  let left = amount;
  const give = (id: string, cents: number) => {
    const take = Math.max(0, Math.min(cents, left));
    if (take === 0) return;
    shares.set(id, (shares.get(id) ?? 0) + take);
    left -= take;
  };

  for (const b of active.filter((b) => b.rule === "fixed")) give(b.id, Math.round(b.rule_value));
  for (const b of active.filter((b) => b.rule === "percent"))
    give(b.id, Math.floor((amount * b.rule_value) / 100));

  const remainder = active.filter((b) => b.rule === "remainder");
  if (remainder.length > 0 && left > 0) {
    const each = Math.floor(left / remainder.length);
    const extra = left - each * remainder.length;
    remainder.forEach((b, i) => give(b.id, each + (i === 0 ? extra : 0)));
  }
  if (left > 0) shares.set(UNALLOCATED, left);

  return [...shares].map(([bucket, cents]) => ({ bucket, amount: cents }));
}

/** Sum of fixed amounts and percent of a deposit — for "you've promised more than this" warnings. */
export function requestedBy(amount: number, buckets: Bucket[]): number {
  return activeBuckets(buckets).reduce(
    (sum, b) =>
      sum +
      (b.rule === "fixed"
        ? b.rule_value
        : b.rule === "percent"
          ? Math.floor((amount * b.rule_value) / 100)
          : 0),
    0
  );
}

export function describeRule(b: Pick<Bucket, "rule" | "rule_value">): string {
  switch (b.rule) {
    case "fixed":
      return `${formatMoney(b.rule_value)} each deposit`;
    case "percent":
      return `${b.rule_value}% of each deposit`;
    case "remainder":
      return "Whatever's left";
    default:
      return "Manual only";
  }
}

// ---------------------------------------------------------------- balances

export type Balances = Map<string, number>;

function apply(balances: Balances, splits: Split[]) {
  for (const s of splits) balances.set(s.bucket, (balances.get(s.bucket) ?? 0) + s.amount);
}

/** Balances from every transaction dated on or before `asOf`. */
export function balancesAsOf(transactions: Transaction[], asOf: string): Balances {
  const balances: Balances = new Map();
  for (const t of transactions) if (t.date <= asOf) apply(balances, t.splits);
  return balances;
}

export const total = (balances: Balances) => [...balances.values()].reduce((a, b) => a + b, 0);

/** Splits for a transaction, with the bucket deltas signed by kind. */
export function signedSplits(kind: Kind, from: string, to: string, amount: number): Split[] {
  if (kind === "withdrawal") return [{ bucket: from, amount: -amount }];
  return [
    { bucket: from, amount: -amount },
    { bucket: to, amount },
  ];
}

// ---------------------------------------------------------------- forecast

export type ForecastPoint = {
  date: string;
  balances: Balances;
  /** What happened on this date, for the table and tooltip. */
  events: { label: string; amount: number; planned: boolean }[];
};

/**
 * Steps forward from today's balances through `through`, applying:
 *   - an automatic deposit on every future payday (split by the bucket
 *     rules), unless a deposit is already recorded for that date;
 *   - every transaction dated after today (planned withdrawals, transfers,
 *     or deposits entered ahead of time).
 * The first point is today.
 */
export function forecast(
  settings: Settings | null,
  buckets: Bucket[],
  transactions: Transaction[],
  from: string,
  through: string
): ForecastPoint[] {
  const balances = balancesAsOf(transactions, from);
  const points: ForecastPoint[] = [{ date: from, balances: new Map(balances), events: [] }];

  type Event = { date: string; splits: Split[]; label: string; amount: number; planned: boolean };
  const events: Event[] = [];

  const future = transactions.filter((t) => t.date > from && t.date <= through);
  for (const t of future)
    events.push({
      date: t.date,
      splits: t.splits,
      label: t.note || kindLabel(t.kind),
      amount: t.kind === "withdrawal" ? -t.amount : t.kind === "deposit" ? t.amount : 0,
      planned: true,
    });

  if (settings) {
    const recordedDeposits = new Set(
      transactions.filter((t) => t.kind === "deposit").map((t) => t.date)
    );
    for (const date of paydaysBetween(settings, from, through)) {
      if (recordedDeposits.has(date)) continue;
      const amount = contributionFor(settings, date);
      if (amount <= 0) continue;
      events.push({
        date,
        splits: allocate(amount, buckets),
        label: isFirstPaydayOfMonth(settings, date) ? "Paycheck (first of month)" : "Paycheck",
        amount,
        planned: false,
      });
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date));
  for (const e of events) {
    apply(balances, e.splits);
    const last = points[points.length - 1];
    const event = { label: e.label, amount: e.amount, planned: e.planned };
    if (last.date === e.date) {
      last.balances = new Map(balances);
      last.events.push(event);
    } else {
      points.push({ date: e.date, balances: new Map(balances), events: [event] });
    }
  }
  return points;
}

/** The first forecast date a bucket's balance reaches its goal, or null. */
export function goalDate(points: ForecastPoint[], bucket: Bucket): string | null {
  if (bucket.goal <= 0) return null;
  const hit = points.find((p) => (p.balances.get(bucket.id) ?? 0) >= bucket.goal);
  return hit?.date ?? null;
}

export function kindLabel(kind: Kind): string {
  return { deposit: "Deposit", withdrawal: "Withdrawal", transfer: "Transfer" }[kind];
}
