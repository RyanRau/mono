/// <reference path="../pb_data/types.d.ts" />

// The budget app (apps/budget): savings split into buckets.
//
// Every collection is private to its owner -- no sharing, no admin override;
// it's personal financial data. Each rule also refuses a write that would
// hand a row to someone else (owner is set on create and can't be changed).
//
// Money is stored as integer cents everywhere, so sums never pick up float
// drift. Calendar dates are "YYYY-MM-DD" text, not DateFields: a payday has
// no time of day or zone, and a datetime would shift it a day for a viewer
// west of UTC.
//
// - budget_settings: one row per user -- the pay schedule (any past payday
//   plus the interval) and how much goes into savings per paycheck. The
//   first paycheck of a month is usually smaller, so it gets its own amount.
// - budget_buckets: the sub-accounts. `rule` decides each one's share of a
//   deposit: a fixed amount, a percent of the deposit, or "remainder"
//   (whatever's left after the fixed and percent buckets). "none" buckets
//   only receive money by hand (a transfer or a custom split).
// - budget_transactions: every money movement. `splits` is a JSON list of
//   {bucket, amount} signed deltas in cents (bucket "" = unallocated), so a
//   deposit, a withdrawal and a transfer are all one row and a bucket's
//   balance is just the sum of its deltas. A row dated in the future is a
//   planned movement: excluded from today's balances, included in the
//   forecast.
const OWNER_ONLY = "owner = @request.auth.id";
const CREATE_OWN = '@request.auth.id != "" && @request.body.owner = @request.auth.id';
const UPDATE_OWN =
  "owner = @request.auth.id && (@request.body.owner:isset = false || @request.body.owner = @request.auth.id)";
const DATE_PATTERN = "^\\d{4}-\\d{2}-\\d{2}$";

migrate(
  (app) => {
    const usersId = app.findCollectionByNameOrId("users").id;
    const owner = {
      type: "relation",
      name: "owner",
      collectionId: usersId,
      required: true,
      maxSelect: 1,
      cascadeDelete: true,
    };
    const rules = {
      listRule: OWNER_ONLY,
      viewRule: OWNER_ONLY,
      createRule: CREATE_OWN,
      updateRule: UPDATE_OWN,
      deleteRule: OWNER_ONLY,
    };

    app.save(
      new Collection({
        type: "base",
        name: "budget_settings",
        fields: [
          owner,
          { type: "text", name: "pay_anchor_date", required: true, pattern: DATE_PATTERN },
          {
            type: "number",
            name: "pay_interval_days",
            required: true,
            min: 1,
            max: 62,
            onlyInt: true,
          },
          // Not required: NumberField's "required" means non-zero, and 0 is
          // a legitimate "nothing this paycheck".
          { type: "number", name: "first_contribution", min: 0, onlyInt: true },
          { type: "number", name: "regular_contribution", min: 0, onlyInt: true },
          { type: "autodate", name: "created", onCreate: true },
          { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
        ],
        indexes: ["CREATE UNIQUE INDEX idx_budget_settings_owner ON budget_settings (owner)"],
        ...rules,
      })
    );

    app.save(
      new Collection({
        type: "base",
        name: "budget_buckets",
        fields: [
          owner,
          { type: "text", name: "name", required: true, max: 100 },
          {
            type: "select",
            name: "rule",
            required: true,
            maxSelect: 1,
            values: ["fixed", "percent", "remainder", "none"],
          },
          // Cents for "fixed", a percent (0-100, decimals allowed) for
          // "percent", ignored otherwise.
          { type: "number", name: "rule_value", min: 0 },
          // Optional savings target in cents; 0 = no goal.
          { type: "number", name: "goal", min: 0, onlyInt: true },
          { type: "number", name: "sort", onlyInt: true },
          { type: "bool", name: "archived" },
          { type: "autodate", name: "created", onCreate: true },
          { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
        ],
        ...rules,
      })
    );

    app.save(
      new Collection({
        type: "base",
        name: "budget_transactions",
        fields: [
          owner,
          { type: "text", name: "date", required: true, pattern: DATE_PATTERN },
          {
            type: "select",
            name: "kind",
            required: true,
            maxSelect: 1,
            values: ["deposit", "withdrawal", "transfer"],
          },
          // Total moved, in cents, always positive; the signed per-bucket
          // breakdown lives in `splits`.
          { type: "number", name: "amount", required: true, min: 0, onlyInt: true },
          { type: "json", name: "splits", required: true, maxSize: 20000 },
          { type: "text", name: "note", max: 500 },
          { type: "autodate", name: "created", onCreate: true },
          { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
        ],
        indexes: [
          "CREATE INDEX idx_budget_transactions_owner_date ON budget_transactions (owner, date)",
        ],
        ...rules,
      })
    );

    // Catalog entry so the admin can grant access from the Admin UI. Not
    // public: this one stays off the signed-out landing page.
    const registryApps = app.findCollectionByNameOrId("registry_apps");
    app.save(
      new Record(registryApps, {
        slug: "budget",
        name: "Budget",
        url: "https://budget.ryanzrau.dev",
        description: "Savings buckets, paycheck splits, and a forecast.",
        icon: "💰",
        public: false,
      })
    );
  },
  (app) => {
    const budget = app.findFirstRecordByFilter("registry_apps", "slug = 'budget'");
    app.delete(budget);
    app.delete(app.findCollectionByNameOrId("budget_transactions"));
    app.delete(app.findCollectionByNameOrId("budget_buckets"));
    app.delete(app.findCollectionByNameOrId("budget_settings"));
  }
);
