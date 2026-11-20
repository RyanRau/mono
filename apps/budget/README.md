# budget

Budget — served at `https://test-budget.ryanzrau.dev`.

Personal savings tracker: money goes into savings every payday, gets split
across **buckets** (emergency fund, car, vacation…) by rules you set, comes out
of buckets as withdrawals, and a **forecast** projects every bucket forward
from your pay schedule.

## How it works

| Page     | What it does                                                                                                                                                   |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview | Total saved, next payday, 12-month projection, and a card per bucket (balance, goal progress, the month the forecast reaches the goal).                        |
| Activity | Every deposit, withdrawal and transfer, newest first. Future-dated entries are tagged **Planned**. Delete an entry to correct a mistake.                       |
| Forecast | Balances projected 3 months to 5 years out, by bucket or total, with a table of goal dates.                                                                    |
| Setup    | The pay schedule (any past payday + days between paychecks) and the savings contribution for the **first paycheck of the month** vs. the others. Bucket rules. |

**Bucket rules.** Each deposit is split in this order:

1. **Fixed** buckets take their amount (in list order) while money lasts.
2. **Percent** buckets take their percent of the _whole_ deposit.
3. **Whatever's left** buckets share the rest evenly.
4. Anything still unclaimed sits in **Unallocated**. You can transfer it into
   a bucket later.

**Manual only** buckets never get an automatic share. They fill up only from
transfers or a hand-made split. Any deposit can be split by hand instead of
by the rules ("Split by hand"). That's also how to enter your starting
balances: one deposit, split however your savings are divided today.

**Paydays.** A payday is "first of the month" when the previous one fell in
an earlier month. On a 14-day schedule that's any payday on the 1st–14th.

**Forecast.** Starts from today's balances. It adds an automatic deposit on
every future payday, split by the current rules, then applies every entry
dated after today (planned withdrawals, transfers, early deposits). A payday
that already has a recorded deposit isn't double-counted.

## Data

Three PocketBase collections, created by
`apps/pocketbase/pb_migrations/1789200000_budget_collections.js`:
`budget_settings` (one row per user), `budget_buckets`, and
`budget_transactions`. Every row is visible only to its owner. Amounts are
integer **cents**, and dates are `"YYYY-MM-DD"` strings (no time zones).

A transaction's `splits` is a list of signed `{bucket, amount}` deltas
(`bucket: ""` = Unallocated), so a bucket's balance is just the sum of its
deltas. The money logic is pure functions in `src/budget.ts`, with no React
or PocketBase in it. `src/useBudget.ts` loads everything once and reloads
after each write.

Access works like the other apps. The migration adds a `budget` row to
`registry_apps`. Admins always get in; anyone else needs a `registry_grants`
row (added in the Admin UI).

## Shared auth, scaffolded for you

`App.tsx` already gates its content on sign-in — signed out, it shows a
`LoginForm`; signed in, it wraps your content in `AppShell` with an
`AccountMenu` in the account slot. This comes from a few files copied
verbatim from `infra/templates/app/src/*.tpl`, common to every app in this
repo (edit them locally if this app needs to deviate — they're not imported
from anywhere shared):

| File                 | What it does                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CookieAuthStore.ts` | Persists the PocketBase auth token as a `.ryanzrau.dev`-scoped cookie instead of `localStorage`, so signing in on any app signs you into all of them.   |
| `useAuth.ts`         | `useAuthRecord()` — the current signed-in user's record, or `null`, re-rendering on auth changes.                                                       |
| `LoginForm.tsx`      | A real login form built from bluestar's `useForm`/`Form` — kept out of bluestar itself since bluestar must not depend on the `pocketbase` package.      |
| `AccountMenu.tsx`    | The avatar-pill dropdown (name/email, a link to the shared settings page at `ryanzrau.dev/settings`, log out) that goes in `AppShell`'s `account` slot. |

## Local development

```bash
cd apps/budget
npm install          # also builds the bluestar file: dependency
npm run dev          # http://localhost:5173
npm run build        # type-check + production build into dist/
```

Point the app at a local backend instead of production with a `.env.local`:

```
VITE_PB_URL=http://localhost:8080
```

After changing `packages/bluestar`, rebuild it (`npm run build` in
`packages/bluestar`) so this app picks the changes up.

## Stack

- **React + TypeScript + Vite**
- **[bluestar](../../packages/bluestar)** for UI — see `packages/PACKAGES.md` for
  the component API. Add missing primitives to bluestar rather than building
  one-off components here.
- **PocketBase** for auth and data via `src/pb.ts` — collections live in
  `apps/pocketbase/pb_migrations`.

## Deployment

Registered in the repo-root `deploy.yml`; pushing to `main` builds and ships it.
Nginx and container config live in this directory (`Dockerfile`, `nginx.conf`).

- `enabled: false` takes it offline.
- `development: true` routes it at `test-budget` instead of the real
  subdomain — delete that line to promote it.
