import { Dropdown, Form, Modal, NumberInput, SubmitButton, TextInput, useForm } from "bluestar";
import { activeBuckets, toCents, toDollars } from "./budget";
import type { Bucket, Rule } from "./budget";
import type { BudgetData } from "./useBudget";

type Values = { name: string; rule: string | null; value: number | null; goal: number | null };

const RULE_OPTIONS: { label: string; value: Rule }[] = [
  { label: "Percent of each deposit", value: "percent" },
  { label: "Fixed amount each deposit", value: "fixed" },
  { label: "Whatever's left over", value: "remainder" },
  { label: "Manual only (no automatic share)", value: "none" },
];

/** Create or edit a bucket. `bucket` undefined = create. */
export function BucketModal({
  data,
  bucket,
  onClose,
}: {
  data: BudgetData;
  bucket?: Bucket;
  onClose: () => void;
}) {
  const form = useForm<Values>({
    initialValues: {
      name: bucket?.name ?? "",
      rule: bucket?.rule ?? "percent",
      value: !bucket
        ? null
        : bucket.rule === "fixed"
          ? toDollars(bucket.rule_value)
          : bucket.rule === "percent"
            ? bucket.rule_value
            : null,
      goal: bucket?.goal ? toDollars(bucket.goal) : null,
    },
    validate: (v) => {
      const errors: Partial<Record<keyof Values, string>> = {};
      if (!v.name.trim()) errors.name = "Required";
      if (!v.rule) errors.rule = "Required";
      if ((v.rule === "fixed" || v.rule === "percent") && (v.value === null || v.value <= 0))
        errors.value = "Enter a value";
      if (v.rule === "percent" && v.value !== null && v.value > 100) errors.value = "At most 100%";
      return errors;
    },
    onSubmit: async (v) => {
      const rule = v.rule as Rule;
      await data.saveBucket(
        {
          name: v.name.trim(),
          rule,
          rule_value: rule === "fixed" ? toCents(v.value) : rule === "percent" ? (v.value ?? 0) : 0,
          goal: toCents(v.goal),
        },
        bucket?.id
      );
      onClose();
    },
  });

  const { rule, value } = form.values;
  const otherPercent = activeBuckets(data.buckets)
    .filter((b) => b.id !== bucket?.id && b.rule === "percent")
    .reduce((sum, b) => sum + b.rule_value, 0);
  const totalPercent = otherPercent + (rule === "percent" ? (value ?? 0) : 0);
  const otherRemainder = activeBuckets(data.buckets).some(
    (b) => b.id !== bucket?.id && b.rule === "remainder"
  );

  return (
    <Modal isOpen onClose={onClose} title={bucket ? `Edit ${bucket.name}` : "New bucket"}>
      <Form form={form}>
        <TextInput
          {...form.field("name")}
          label="Name"
          placeholder="e.g. Emergency fund"
          required
        />
        <Dropdown
          {...form.field("rule")}
          label="Share of each deposit"
          options={RULE_OPTIONS}
          required
          warning={
            rule === "remainder" && otherRemainder
              ? "Another bucket also takes what's left — the leftover will be split evenly between them."
              : undefined
          }
        />
        {rule === "percent" && (
          <NumberInput
            {...form.field("value")}
            label="Percent (%)"
            min={0}
            max={100}
            step={0.5}
            description={`Percent of the whole deposit. All percent buckets together: ${totalPercent}%.`}
            warning={totalPercent > 100 ? "Percent buckets add up to more than 100%." : undefined}
            required
          />
        )}
        {rule === "fixed" && (
          <NumberInput
            {...form.field("value")}
            label="Amount per deposit ($)"
            min={0}
            step={0.01}
            description="Taken first, before percent buckets."
            required
          />
        )}
        <NumberInput
          {...form.field("goal")}
          label="Goal ($)"
          min={0}
          step={1}
          placeholder="Optional"
          description="A target balance — the forecast estimates when you'll reach it."
        />
        <SubmitButton label={bucket ? "Save" : "Add bucket"} variant="creation" />
      </Form>
    </Modal>
  );
}
