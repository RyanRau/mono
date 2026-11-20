import { useState } from "react";
import {
  Alert,
  Card,
  Flexbox,
  Header,
  LineChart,
  SegmentedControl,
  Table,
  Text,
  useColorScheme,
} from "bluestar";
import type { LineChartSeries } from "bluestar";
import {
  activeBuckets,
  addMonths,
  formatDate,
  formatMoney,
  formatMoneyShort,
  formatMonth,
  forecast,
  goalDate,
  today,
  total,
  UNALLOCATED,
} from "./budget";
import type { ForecastPoint } from "./budget";
import type { BudgetData } from "./useBudget";
import { seriesColors, TOTAL_COLOR } from "./palette";

type Horizon = "3" | "6" | "12" | "24" | "60";
type View = "total" | "buckets";

/** Projected balances: future paydays split by the bucket rules, plus planned entries. */
export function ForecastPage({ data }: { data: BudgetData }) {
  const { settings, buckets, transactions } = data;
  const [horizon, setHorizon] = useState<Horizon>("12");
  const [view, setView] = useState<View>("buckets");
  const { resolved } = useColorScheme();

  const now = today();
  const end = addMonths(now, Number(horizon));
  const points = forecast(settings, buckets, transactions, now, end);
  const last = points[points.length - 1];
  const showYear = Number(horizon) > 6 || end.slice(0, 4) !== now.slice(0, 4);
  const xLabel = (p: ForecastPoint) => formatDate(p.date, { year: showYear });

  // Series per bucket in a fixed order (the bucket's own sort), so a
  // bucket keeps its color however the view is filtered. The palette has
  // eight validated slots; anything past that folds into "Other".
  const tracked = [
    ...activeBuckets(buckets).map((b) => ({ key: b.id, label: b.name })),
    ...(points.some((p) => (p.balances.get(UNALLOCATED) ?? 0) !== 0)
      ? [{ key: UNALLOCATED, label: "Unallocated" }]
      : []),
  ];
  const colors = seriesColors(resolved);
  const direct = tracked.slice(0, tracked.length > 8 ? 7 : 8);
  const folded = tracked.slice(direct.length);

  const bucketSeries: LineChartSeries[] = [
    ...direct.map((t, i) => ({
      key: t.key || "unallocated",
      label: t.label,
      color: colors[i],
      points: points.map((p) => ({ x: xLabel(p), y: (p.balances.get(t.key) ?? 0) / 100 })),
    })),
    ...(folded.length
      ? [
          {
            key: "other",
            label: "Other",
            color: colors[7],
            points: points.map((p) => ({
              x: xLabel(p),
              y: folded.reduce((s, t) => s + (p.balances.get(t.key) ?? 0), 0) / 100,
            })),
          },
        ]
      : []),
  ];
  const totalSeries: LineChartSeries[] = [
    {
      key: "total",
      label: "Total savings",
      color: TOTAL_COLOR[resolved],
      points: points.map((p) => ({ x: xLabel(p), y: total(p.balances) / 100 })),
    },
  ];

  const startTotal = total(points[0].balances);
  const endTotal = total(last.balances);
  const goingNegative = points.find((p) => [...p.balances.values()].some((v) => v < 0));

  return (
    <Flexbox direction="column" gap={24}>
      <Header variant="h1">Forecast</Header>
      {!settings && (
        <Alert variant="info">
          Without a pay schedule the forecast only includes entries you've planned. Add one on the
          Setup page.
        </Alert>
      )}

      <Flexbox gap={12} flexWrap="wrap">
        <SegmentedControl<Horizon>
          options={[
            { label: "3 mo", value: "3" },
            { label: "6 mo", value: "6" },
            { label: "1 yr", value: "12" },
            { label: "2 yr", value: "24" },
            { label: "5 yr", value: "60" },
          ]}
          value={horizon}
          onChange={setHorizon}
        />
        <SegmentedControl<View>
          options={[
            { label: "By bucket", value: "buckets" },
            { label: "Total", value: "total" },
          ]}
          value={view}
          onChange={setView}
        />
      </Flexbox>

      <Card padding={16}>
        <Flexbox direction="column" gap={12}>
          <Text variant="body">
            {formatMoney(startTotal)} today → <strong>{formatMoney(endTotal)}</strong> by{" "}
            {formatDate(end, { year: true })} ({endTotal >= startTotal ? "+" : ""}
            {formatMoney(endTotal - startTotal)}).
          </Text>
          {points.length > 1 ? (
            <LineChart
              ariaLabel={`Projected savings ${view === "total" ? "total" : "by bucket"} through ${formatDate(end, { year: true })}`}
              series={view === "total" || tracked.length === 0 ? totalSeries : bucketSeries}
              formatValue={(n) => formatMoneyShort(n * 100)}
              height={300}
            />
          ) : (
            <Text variant="caption">Nothing scheduled in this range.</Text>
          )}
          {settings && (
            <Text variant="caption">
              Assumes {formatMoney(settings.first_contribution)} on the first payday of each month
              and {formatMoney(settings.regular_contribution)} on the others, every{" "}
              {settings.pay_interval_days} days, split by your bucket rules — plus anything you've
              entered with a future date.
            </Text>
          )}
        </Flexbox>
      </Card>

      {goingNegative && (
        <Alert variant="warning" title="A bucket goes negative">
          By {formatDate(goingNegative.date, { year: true })}, planned withdrawals take a bucket
          below zero. The chart starts at $0, so check the table below.
        </Alert>
      )}

      <Table
        rows={tracked}
        rowKey={(t) => t.key || "unallocated"}
        columns={[
          { header: "Bucket", cell: (t) => t.label },
          {
            header: "Today",
            align: "right",
            cell: (t) => formatMoney(points[0].balances.get(t.key) ?? 0),
          },
          {
            header: formatDate(end, { year: true }),
            align: "right",
            cell: (t) => formatMoney(last.balances.get(t.key) ?? 0),
          },
          {
            header: "Goal",
            cell: (t) => {
              const bucket = buckets.find((b) => b.id === t.key);
              if (!bucket || bucket.goal <= 0) return "—";
              const hit = goalDate(points, bucket);
              return `${formatMoney(bucket.goal)} · ${hit ? (hit === now ? "reached" : formatMonth(hit)) : "not in range"}`;
            },
          },
        ]}
      />
    </Flexbox>
  );
}
