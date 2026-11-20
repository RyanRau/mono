import { useState } from "react";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Flexbox,
  Header,
  SegmentedControl,
  Table,
  Text,
} from "bluestar";
import { formatDate, formatMoney, formatSigned, kindLabel, today } from "./budget";
import type { Transaction } from "./budget";
import type { BudgetData } from "./useBudget";
import { bucketName } from "./bucketName";

type Filter = "all" | "planned" | "deposit" | "withdrawal" | "transfer";

/** Every money movement, newest first, including planned (future-dated) ones. */
export function ActivityPage({ data }: { data: BudgetData }) {
  const { buckets, transactions } = data;
  const [filter, setFilter] = useState<Filter>("all");
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const now = today();

  const rows = transactions.filter((t) =>
    filter === "all" ? true : filter === "planned" ? t.date > now : t.kind === filter
  );

  return (
    <Flexbox direction="column" gap={24}>
      <Header variant="h1">Activity</Header>
      <Flexbox>
        <SegmentedControl<Filter>
          options={[
            { label: "All", value: "all" },
            { label: "Planned", value: "planned" },
            { label: "Deposits", value: "deposit" },
            { label: "Withdrawals", value: "withdrawal" },
            { label: "Transfers", value: "transfer" },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </Flexbox>
      <Table
        rows={rows}
        rowKey={(t) => t.id}
        empty={
          <EmptyState
            title="Nothing here yet"
            description="Recorded deposits, withdrawals and transfers show up here."
          />
        }
        columns={[
          {
            header: "Date",
            cell: (t) => (
              <Flexbox gap={8} alignItems="center">
                {formatDate(t.date)}
                {t.date > now && (
                  <Badge variant="warning" emphasis="subtle">
                    Planned
                  </Badge>
                )}
              </Flexbox>
            ),
          },
          { header: "Type", cell: (t) => kindLabel(t.kind) },
          {
            header: "Amount",
            align: "right",
            cell: (t) =>
              t.kind === "transfer"
                ? formatMoney(t.amount)
                : formatSigned(t.kind === "withdrawal" ? -t.amount : t.amount),
          },
          {
            header: "Buckets",
            cell: (t) => (
              <Flexbox direction="column" gap={4}>
                {t.splits.map((s, i) => (
                  <Text key={i} variant="caption" as="span">
                    {bucketName(s.bucket, buckets)} {formatSigned(s.amount)}
                  </Text>
                ))}
              </Flexbox>
            ),
          },
          { header: "Note", cell: (t) => t.note },
          {
            header: "",
            width: "90px",
            cell: (t) => (
              <Button
                label="Delete"
                variant="destructive"
                appearance="text"
                density="dense"
                onClick={() => setDeleting(t)}
              />
            ),
          },
        ]}
      />
      <ConfirmDialog
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          await data.deleteTransaction(deleting!.id);
          setDeleting(null);
        }}
        title="Delete this entry?"
        message={
          deleting
            ? `${kindLabel(deleting.kind)} of ${formatMoney(deleting.amount)} on ${formatDate(deleting.date)}. Bucket balances will be recalculated without it.`
            : ""
        }
        confirmLabel="Delete"
      />
    </Flexbox>
  );
}
