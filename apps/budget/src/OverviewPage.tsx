import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Flexbox,
  Grid,
  Header,
  ProgressBar,
  StatTile,
  Text,
} from "bluestar";
import {
  activeBuckets,
  addMonths,
  balancesAsOf,
  contributionFor,
  describeRule,
  formatDate,
  formatMoney,
  formatMonth,
  forecast,
  goalDate,
  paydaysBetween,
  today,
  total,
  UNALLOCATED,
} from "./budget";
import type { Bucket } from "./budget";
import type { BudgetData } from "./useBudget";
import type { MoveKind } from "./MoveMoneyModal";

export function OverviewPage({
  data,
  onDeposit,
  onMove,
  onSetup,
}: {
  data: BudgetData;
  onDeposit: () => void;
  onMove: (kind: MoveKind, from?: string) => void;
  onSetup: () => void;
}) {
  const { settings, buckets, transactions } = data;
  const now = today();
  const balances = balancesAsOf(transactions, now);
  const nextPayday = settings ? paydaysBetween(settings, now, addMonths(now, 2))[0] : undefined;
  const yearOut = forecast(settings, buckets, transactions, now, addMonths(now, 12));
  const inAYear = total(yearOut[yearOut.length - 1].balances);
  // Goals are looked for up to five years out.
  const longRun = forecast(settings, buckets, transactions, now, addMonths(now, 60));

  const planned = transactions.filter((t) => t.date > now && t.kind !== "deposit");
  const unallocated = balances.get(UNALLOCATED) ?? 0;
  const shown = [
    ...activeBuckets(buckets),
    ...buckets.filter((b) => b.archived && (balances.get(b.id) ?? 0) !== 0),
  ];

  return (
    <Flexbox direction="column" gap={24}>
      <Flexbox justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={12}>
        <Header variant="h1">Savings</Header>
        <Flexbox gap={8} flexWrap="wrap">
          <Button label="Record deposit" variant="creation" onClick={onDeposit} />
          <Button
            label="Withdraw"
            variant="secondary"
            appearance="outline"
            onClick={() => onMove("withdrawal")}
          />
          <Button
            label="Transfer"
            variant="secondary"
            appearance="outline"
            onClick={() => onMove("transfer")}
          />
        </Flexbox>
      </Flexbox>

      {!settings && (
        <Alert variant="info" title="Set up your pay schedule">
          <Flexbox direction="column" gap={8} alignItems="flex-start">
            Tell the app when you get paid and how much goes to savings, so it can fill in deposits
            and forecast your balances.
            <Button label="Go to setup" density="dense" onClick={onSetup} />
          </Flexbox>
        </Alert>
      )}

      <Grid minColumnWidth={200}>
        <StatTile label="Total saved" value={formatMoney(total(balances))} />
        {settings && nextPayday && (
          <StatTile
            label={`Next payday · ${formatDate(nextPayday)}`}
            value={`+${formatMoney(contributionFor(settings, nextPayday))}`}
          />
        )}
        {settings && <StatTile label="Projected in 12 months" value={formatMoney(inAYear)} />}
      </Grid>

      {shown.length === 0 && unallocated === 0 ? (
        <EmptyState
          title="No buckets yet"
          description="Buckets are the pots your savings are split into — an emergency fund, a trip, a new car."
          action={<Button label="Add buckets" onClick={onSetup} />}
        />
      ) : (
        <Grid minColumnWidth={260}>
          {shown.map((b) => (
            <BucketCard
              key={b.id}
              bucket={b}
              balance={balances.get(b.id) ?? 0}
              reachBy={goalDate(longRun, b)}
              planned={planned
                .flatMap((t) =>
                  t.splits.filter((s) => s.bucket === b.id).map((s) => ({ date: t.date, ...s }))
                )
                .sort((x, y) => x.date.localeCompare(y.date))}
              onWithdraw={() => onMove("withdrawal", b.id)}
            />
          ))}
          {unallocated !== 0 && (
            <Card padding={16}>
              <Flexbox direction="column" gap={8}>
                <Text variant="label">Unallocated</Text>
                <Header variant="h2">{formatMoney(unallocated)}</Header>
                <Text variant="caption">
                  Deposits not claimed by any bucket rule. Transfer it into a bucket, or add a
                  "whatever's left" bucket to catch it.
                </Text>
                <Flexbox>
                  <Button
                    label="Move to a bucket"
                    density="dense"
                    appearance="outline"
                    variant="secondary"
                    onClick={() => onMove("transfer", UNALLOCATED)}
                  />
                </Flexbox>
              </Flexbox>
            </Card>
          )}
        </Grid>
      )}
    </Flexbox>
  );
}

function BucketCard({
  bucket,
  balance,
  reachBy,
  planned,
  onWithdraw,
}: {
  bucket: Bucket;
  balance: number;
  reachBy: string | null;
  planned: { date: string; amount: number }[];
  onWithdraw: () => void;
}) {
  const goalMet = bucket.goal > 0 && balance >= bucket.goal;
  return (
    <Card padding={16}>
      <Flexbox direction="column" gap={8}>
        <Flexbox justifyContent="space-between" alignItems="center" gap={8}>
          <Text variant="label">{bucket.name}</Text>
          {bucket.archived ? (
            <Badge>Archived</Badge>
          ) : (
            <Badge variant="primary" emphasis="subtle">
              {describeRule(bucket)}
            </Badge>
          )}
        </Flexbox>
        <Header variant="h2">{formatMoney(balance)}</Header>
        {balance < 0 && <Text variant="caption">This bucket is overdrawn.</Text>}
        {bucket.goal > 0 && (
          <Flexbox direction="column" gap={4}>
            <ProgressBar
              value={balance}
              max={bucket.goal}
              label={`${bucket.name} goal`}
              variant={goalMet ? "success" : "primary"}
            />
            <Text variant="caption">
              {goalMet
                ? `Goal of ${formatMoney(bucket.goal)} reached`
                : `${formatMoney(balance)} of ${formatMoney(bucket.goal)}` +
                  (reachBy
                    ? ` · on track for ${formatMonth(reachBy)}`
                    : " · not reached in 5 years")}
            </Text>
          </Flexbox>
        )}
        {planned.map((p, i) => (
          <Text key={i} variant="caption">
            Planned {formatDate(p.date)}: {p.amount > 0 ? "+" : ""}
            {formatMoney(p.amount)}
          </Text>
        ))}
        <Flexbox>
          <Button
            label="Withdraw"
            density="dense"
            appearance="text"
            variant="secondary"
            onClick={onWithdraw}
          />
        </Flexbox>
      </Flexbox>
    </Card>
  );
}
