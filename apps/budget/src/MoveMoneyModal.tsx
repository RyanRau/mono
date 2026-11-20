import {
  DateInput,
  Dropdown,
  Form,
  Modal,
  NumberInput,
  SegmentedControl,
  SubmitButton,
  TextInput,
  useForm,
} from "bluestar";
import {
  activeBuckets,
  balancesAsOf,
  formatMoney,
  signedSplits,
  toCents,
  today,
  UNALLOCATED,
} from "./budget";
import type { BudgetData } from "./useBudget";

export type MoveKind = "withdrawal" | "transfer";

// Dropdown treats "" as no selection, so the unallocated pool needs a stand-in.
const UNALLOCATED_OPTION = "__unallocated";
const toBucket = (option: string | null) =>
  option === UNALLOCATED_OPTION ? UNALLOCATED : (option ?? "");
const toOption = (bucket: string) => (bucket === UNALLOCATED ? UNALLOCATED_OPTION : bucket);

type Values = {
  kind: MoveKind;
  date: string;
  from: string | null;
  to: string | null;
  amount: number | null;
  note: string;
};

/** Take money out of a bucket, or move it between buckets. */
export function MoveMoneyModal({
  data,
  initialKind,
  initialFrom,
  onClose,
}: {
  data: BudgetData;
  initialKind: MoveKind;
  initialFrom?: string;
  onClose: () => void;
}) {
  const { buckets, transactions } = data;

  const form = useForm<Values>({
    initialValues: {
      kind: initialKind,
      date: today(),
      from: initialFrom === undefined ? null : toOption(initialFrom),
      to: null,
      amount: null,
      note: "",
    },
    validate: (v) => {
      const errors: Partial<Record<keyof Values, string>> = {};
      if (!v.date) errors.date = "Required";
      if (!v.from) errors.from = "Pick a bucket";
      if (v.kind === "transfer" && !v.to) errors.to = "Pick a bucket";
      if (v.kind === "transfer" && v.to && v.to === v.from) errors.to = "Pick a different bucket";
      if (!v.amount || v.amount <= 0) errors.amount = "Enter an amount";
      return errors;
    },
    onSubmit: async (v) => {
      const amount = toCents(v.amount);
      await data.addTransaction({
        date: v.date,
        kind: v.kind,
        amount,
        splits: signedSplits(v.kind, toBucket(v.from), toBucket(v.to), amount),
        note: v.note.trim(),
      });
      onClose();
    },
  });

  const { kind, date, from, amount } = form.values;
  const balances = balancesAsOf(transactions, date || today());
  const balanceOf = (option: string) => balances.get(toBucket(option)) ?? 0;

  // Every live bucket, plus archived ones and the unallocated pool only when
  // they still hold money.
  const options = [
    ...activeBuckets(buckets).map((b) => b.id),
    ...buckets.filter((b) => b.archived && balanceOf(b.id) !== 0).map((b) => b.id),
    ...(balanceOf(UNALLOCATED_OPTION) !== 0 ? [UNALLOCATED_OPTION] : []),
  ].map((id) => ({
    value: id,
    label: `${id === UNALLOCATED_OPTION ? "Unallocated" : buckets.find((b) => b.id === id)!.name} · ${formatMoney(balanceOf(id))}`,
  }));

  const overdraw = from !== null && toCents(amount) > balanceOf(from);
  const verb = kind === "withdrawal" ? "Withdraw" : "Transfer";

  return (
    <Modal isOpen onClose={onClose} title={kind === "withdrawal" ? "Withdraw" : "Transfer"}>
      <Form form={form}>
        <SegmentedControl<MoveKind>
          options={[
            { label: "Withdraw", value: "withdrawal" },
            { label: "Transfer", value: "transfer" },
          ]}
          value={kind}
          onChange={(k) => form.setValue("kind", k)}
        />
        <DateInput
          {...form.field("date")}
          label="Date"
          description={
            date > today() ? "Future date: planned — shows up in the forecast." : undefined
          }
          required
        />
        <Dropdown
          {...form.field("from")}
          label={kind === "withdrawal" ? "From bucket" : "From"}
          options={options}
          placeholder="Choose a bucket"
          required
        />
        {kind === "transfer" && (
          <Dropdown
            {...form.field("to")}
            label="To"
            options={options.filter((o) => o.value !== from)}
            placeholder="Choose a bucket"
            required
          />
        )}
        <NumberInput
          {...form.field("amount")}
          label="Amount ($)"
          min={0}
          step={0.01}
          required
          warning={
            overdraw
              ? `More than this bucket will hold on that date (${formatMoney(balanceOf(from!))}).`
              : undefined
          }
        />
        <TextInput {...form.field("note")} label="Note" placeholder="What's it for?" />
        <SubmitButton label={verb} variant={kind === "withdrawal" ? "destructive" : "primary"} />
      </Form>
    </Modal>
  );
}
