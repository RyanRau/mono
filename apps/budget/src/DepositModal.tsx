import { useState } from "react";
import {
  Alert,
  DateInput,
  Flexbox,
  Form,
  Modal,
  NumberInput,
  SubmitButton,
  Switch,
  Table,
  Text,
  TextInput,
  useForm,
} from "bluestar";
import {
  activeBuckets,
  addDays,
  allocate,
  contributionFor,
  formatMoney,
  isFirstPaydayOfMonth,
  isPayday,
  paydaysBetween,
  toCents,
  toDollars,
  today,
  UNALLOCATED,
} from "./budget";
import type { Split } from "./budget";
import type { BudgetData } from "./useBudget";
import { bucketName } from "./bucketName";

type Values = { date: string; amount: number | null; note: string; customize: boolean };

/** Record money going into savings, split across buckets by their rules or by hand. */
export function DepositModal({ data, onClose }: { data: BudgetData; onClose: () => void }) {
  const { settings, buckets, transactions } = data;
  const active = activeBuckets(buckets);

  // Default to the most recent payday (today, if it is one) and that
  // paycheck's contribution.
  const latestPayday = settings
    ? paydaysBetween(settings, addDays(today(), -settings.pay_interval_days), today()).pop()
    : undefined;
  const initialDate = latestPayday ?? today();
  const defaultAmountFor = (date: string) =>
    settings && date && isPayday(settings, date) ? contributionFor(settings, date) : null;

  const [amountEdited, setAmountEdited] = useState(false);
  const [custom, setCustom] = useState<Record<string, number | null>>({});

  const customTotal = active.reduce((sum, b) => sum + toCents(custom[b.id] ?? 0), 0);
  const splitsFor = (v: Values): Split[] => {
    const cents = toCents(v.amount);
    if (!v.customize) return allocate(cents, buckets);
    return [
      ...active.map((b) => ({ bucket: b.id, amount: toCents(custom[b.id] ?? 0) })),
      { bucket: UNALLOCATED, amount: cents - customTotal },
    ].filter((s) => s.amount !== 0);
  };

  const initialAmount = defaultAmountFor(initialDate);
  const form = useForm<Values>({
    initialValues: {
      date: initialDate,
      amount: initialAmount === null ? null : toDollars(initialAmount),
      note: "",
      customize: false,
    },
    validate: (v) => {
      const errors: Partial<Record<keyof Values, string>> = {};
      if (!v.date) errors.date = "Required";
      if (!v.amount || v.amount <= 0) errors.amount = "Enter an amount";
      if (v.customize && customTotal > toCents(v.amount)) errors.customize = "Split exceeds amount";
      return errors;
    },
    onSubmit: async (v) => {
      await data.addTransaction({
        date: v.date,
        kind: "deposit",
        amount: toCents(v.amount),
        splits: splitsFor(v),
        note: v.note.trim(),
      });
      onClose();
    },
  });

  const cents = toCents(form.values.amount);
  const splits = splitsFor(form.values);

  const dateField = form.field("date");
  const amountField = form.field("amount");
  const customizeField = form.field("customize");
  const date = form.values.date;
  const alreadyRecorded = transactions.some((t) => t.kind === "deposit" && t.date === date);

  const dateHint =
    settings && date && isPayday(settings, date)
      ? isFirstPaydayOfMonth(settings, date)
        ? "Payday — first of the month."
        : "Payday."
      : date > today()
        ? "Future date: counted as planned until then."
        : undefined;

  return (
    <Modal isOpen onClose={onClose} title="Record deposit" width={560}>
      <Form form={form} maxWidth={null}>
        <DateInput
          {...dateField}
          label="Date"
          description={dateHint}
          warning={alreadyRecorded ? "There's already a deposit on this date." : undefined}
          required
          onChange={(d) => {
            dateField.onChange(d);
            const suggested = defaultAmountFor(d);
            if (!amountEdited && suggested !== null) form.setValue("amount", toDollars(suggested));
          }}
        />
        <NumberInput
          {...amountField}
          label="Amount ($)"
          min={0}
          step={0.01}
          required
          onChange={(v) => {
            setAmountEdited(true);
            amountField.onChange(v);
          }}
        />
        <TextInput {...form.field("note")} label="Note" placeholder="Optional" />
        {active.length > 0 && (
          <Switch
            {...customizeField}
            label="Split by hand"
            description="Override the bucket rules for this deposit — e.g. to enter starting balances."
            onChange={(on) => {
              if (on) {
                // Start from what the rules would do.
                const auto = new Map(allocate(cents, buckets).map((s) => [s.bucket, s.amount]));
                setCustom(
                  Object.fromEntries(active.map((b) => [b.id, toDollars(auto.get(b.id) ?? 0)]))
                );
              }
              customizeField.onChange(on);
            }}
          />
        )}

        {form.values.customize ? (
          <Flexbox direction="column" gap={12}>
            {active.map((b) => (
              <NumberInput
                key={b.id}
                label={`${b.name} ($)`}
                value={custom[b.id] ?? null}
                onChange={(v) => setCustom((prev) => ({ ...prev, [b.id]: v }))}
                min={0}
                step={0.01}
              />
            ))}
            {customTotal > cents ? (
              <Alert variant="error">
                The split adds up to {formatMoney(customTotal)}, more than the {formatMoney(cents)}{" "}
                deposit.
              </Alert>
            ) : (
              <Text variant="caption">Unallocated: {formatMoney(cents - customTotal)}</Text>
            )}
          </Flexbox>
        ) : (
          cents > 0 && (
            <Flexbox direction="column" gap={8}>
              <Text variant="label">Split</Text>
              {active.length === 0 && (
                <Text variant="caption">
                  No buckets yet — this all goes to Unallocated. Add buckets on the Setup page.
                </Text>
              )}
              <Table
                rows={splits}
                rowKey={(s) => s.bucket || "unallocated"}
                columns={[
                  { header: "Bucket", cell: (s) => bucketName(s.bucket, buckets) },
                  {
                    header: "Amount",
                    cell: (s) => formatMoney(s.amount),
                    align: "right",
                  },
                ]}
              />
            </Flexbox>
          )
        )}
        <SubmitButton label="Record deposit" variant="creation" />
      </Form>
    </Modal>
  );
}
