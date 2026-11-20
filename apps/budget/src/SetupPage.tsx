import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  DateInput,
  EmptyState,
  Flexbox,
  Form,
  Header,
  NumberInput,
  SubmitButton,
  Table,
  Text,
  useForm,
  useToast,
} from "bluestar";
import {
  activeBuckets,
  addDays,
  addMonths,
  allocate,
  contributionFor,
  describeRule,
  formatDate,
  formatMoney,
  isFirstPaydayOfMonth,
  paydaysBetween,
  requestedBy,
  toCents,
  toDollars,
  today,
} from "./budget";
import type { Bucket, Settings } from "./budget";
import type { BudgetData } from "./useBudget";
import { BucketModal } from "./BucketModal";
import { bucketName } from "./bucketName";

type ScheduleValues = {
  anchor: string;
  interval: number | null;
  first: number | null;
  regular: number | null;
};

export function SetupPage({ data }: { data: BudgetData }) {
  const { settings, buckets } = data;
  const toast = useToast();
  const [editing, setEditing] = useState<Bucket | "new" | null>(null);

  const form = useForm<ScheduleValues>({
    initialValues: {
      anchor: settings?.pay_anchor_date ?? today(),
      interval: settings?.pay_interval_days ?? 14,
      first: settings ? toDollars(settings.first_contribution) : null,
      regular: settings ? toDollars(settings.regular_contribution) : null,
    },
    validate: (v) => {
      const errors: Partial<Record<keyof ScheduleValues, string>> = {};
      if (!v.anchor) errors.anchor = "Required";
      if (!v.interval || v.interval < 1 || !Number.isInteger(v.interval))
        errors.interval = "Whole number of days";
      if (v.first === null || v.first < 0) errors.first = "Required";
      if (v.regular === null || v.regular < 0) errors.regular = "Required";
      return errors;
    },
    onSubmit: async (v) => {
      await data.saveSettings({
        pay_anchor_date: v.anchor,
        pay_interval_days: v.interval!,
        first_contribution: toCents(v.first),
        regular_contribution: toCents(v.regular),
      });
      toast.success("Pay schedule saved");
    },
  });

  // Preview from the form as typed, so changes show before saving.
  const draft: Settings | null =
    form.values.anchor && form.values.interval && form.values.interval >= 1
      ? {
          id: "",
          pay_anchor_date: form.values.anchor,
          pay_interval_days: Math.round(form.values.interval),
          first_contribution: toCents(form.values.first),
          regular_contribution: toCents(form.values.regular),
        }
      : null;
  const upcoming = draft
    ? paydaysBetween(draft, addDays(today(), -1), addMonths(today(), 3)).slice(0, 6)
    : [];

  const active = activeBuckets(buckets);
  const archived = buckets.filter((b) => b.archived);

  return (
    <Flexbox direction="column" gap={24}>
      <Header variant="h1">Setup</Header>

      <Card padding={20}>
        <Flexbox direction="column" gap={16}>
          <Header variant="h3">Pay schedule</Header>
          <Flexbox gap={32} flexWrap="wrap" alignItems="flex-start">
            <Form form={form}>
              <DateInput
                {...form.field("anchor")}
                label="A recent payday"
                description="Any real payday — the schedule repeats from it."
                required
              />
              <NumberInput
                {...form.field("interval")}
                label="Days between paychecks"
                min={1}
                step={1}
                required
              />
              <NumberInput
                {...form.field("first")}
                label="To savings — first paycheck of the month ($)"
                description="The smaller one."
                min={0}
                step={0.01}
                required
              />
              <NumberInput
                {...form.field("regular")}
                label="To savings — other paychecks ($)"
                min={0}
                step={0.01}
                required
              />
              <SubmitButton label="Save schedule" />
            </Form>
            {draft && upcoming.length > 0 && (
              <Flexbox direction="column" gap={8}>
                <Text variant="label">Upcoming paydays</Text>
                {upcoming.map((d) => (
                  <Flexbox key={d} gap={8} alignItems="center">
                    <Text variant="body" as="span">
                      {formatDate(d)} · {formatMoney(contributionFor(draft, d))}
                    </Text>
                    {isFirstPaydayOfMonth(draft, d) && (
                      <Badge variant="primary" emphasis="subtle">
                        First of month
                      </Badge>
                    )}
                  </Flexbox>
                ))}
              </Flexbox>
            )}
          </Flexbox>
        </Flexbox>
      </Card>

      <Card padding={20}>
        <Flexbox direction="column" gap={16}>
          <Flexbox justifyContent="space-between" alignItems="center" gap={12}>
            <Header variant="h3">Buckets</Header>
            <Button label="Add bucket" variant="creation" onClick={() => setEditing("new")} />
          </Flexbox>
          <Text variant="caption">
            Each deposit fills fixed-amount buckets first, then percent buckets (a percent of the
            whole deposit), then "whatever's left" buckets. Anything still unclaimed sits in
            Unallocated.
          </Text>
          <Table
            rows={[...active, ...archived]}
            rowKey={(b) => b.id}
            empty={
              <EmptyState
                title="No buckets yet"
                description="Add one to start splitting deposits."
              />
            }
            columns={[
              {
                header: "Name",
                cell: (b) => (
                  <Flexbox gap={8} alignItems="center">
                    {b.name}
                    {b.archived && <Badge>Archived</Badge>}
                  </Flexbox>
                ),
              },
              { header: "Share", cell: (b) => (b.archived ? "—" : describeRule(b)) },
              { header: "Goal", cell: (b) => (b.goal > 0 ? formatMoney(b.goal) : "—") },
              {
                header: "",
                width: "180px",
                cell: (b) => (
                  <Flexbox gap={4} justifyContent="flex-end">
                    <Button
                      label="Edit"
                      density="dense"
                      appearance="text"
                      variant="secondary"
                      onClick={() => setEditing(b)}
                    />
                    <Button
                      label={b.archived ? "Restore" : "Archive"}
                      density="dense"
                      appearance="text"
                      variant="secondary"
                      onClick={() => data.setArchived(b.id, !b.archived)}
                    />
                  </Flexbox>
                ),
              },
            ]}
          />
          {draft && active.length > 0 && <SplitPreview settings={draft} buckets={buckets} />}
        </Flexbox>
      </Card>

      {editing && (
        <BucketModal
          data={data}
          bucket={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Flexbox>
  );
}

/** How each kind of paycheck would be split right now. */
function SplitPreview({ settings, buckets }: { settings: Settings; buckets: Bucket[] }) {
  const amounts = [
    { label: "First paycheck", cents: settings.first_contribution },
    { label: "Other paychecks", cents: settings.regular_contribution },
  ];
  const splits = amounts.map(
    (a) => new Map(allocate(a.cents, buckets).map((s) => [s.bucket, s.amount]))
  );
  const ids = [...new Set(splits.flatMap((m) => [...m.keys()]))];
  const short = amounts.filter((a) => requestedBy(a.cents, buckets) > a.cents);

  return (
    <Flexbox direction="column" gap={8}>
      <Text variant="label">How a paycheck splits</Text>
      <Table
        rows={ids}
        rowKey={(id) => id || "unallocated"}
        columns={[
          { header: "Bucket", cell: (id) => bucketName(id, buckets) },
          ...amounts.map((a, i) => ({
            header: `${a.label} (${formatMoney(a.cents)})`,
            align: "right" as const,
            cell: (id: string) => formatMoney(splits[i].get(id) ?? 0),
          })),
        ]}
      />
      {short.length > 0 && (
        <Text variant="caption">
          Your fixed and percent buckets ask for more than the{" "}
          {short.map((a) => a.label.toLowerCase()).join(" and ")} contribution — fixed buckets are
          filled first (in list order), and percent buckets get what's left.
        </Text>
      )}
    </Flexbox>
  );
}
