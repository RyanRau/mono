import { useCallback, useEffect, useState } from "react";
import { pb } from "./pb";
import type { Bucket, Settings, Transaction } from "./budget";

export type BudgetData = {
  loaded: boolean;
  settings: Settings | null;
  buckets: Bucket[];
  transactions: Transaction[];
  saveSettings: (values: Omit<Settings, "id">) => Promise<void>;
  saveBucket: (values: Omit<Bucket, "id" | "sort" | "archived">, id?: string) => Promise<void>;
  setArchived: (id: string, archived: boolean) => Promise<void>;
  addTransaction: (values: Omit<Transaction, "id" | "created">) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
};

type Fetched = { settings: Settings | null; buckets: Bucket[]; transactions: Transaction[] };

async function fetchAll(): Promise<Fetched> {
  const [s, b, t] = await Promise.all([
    pb.collection("budget_settings").getFullList<Settings>({ requestKey: "budget-settings" }),
    pb
      .collection("budget_buckets")
      .getFullList<Bucket>({ sort: "sort,created", requestKey: "budget-buckets" }),
    pb
      .collection("budget_transactions")
      .getFullList<Transaction>({ sort: "-date,-created", requestKey: "budget-transactions" }),
  ]);
  return {
    settings: s[0] ?? null,
    buckets: b,
    transactions: t.map((row) => ({ ...row, splits: row.splits ?? [] })),
  };
}

/**
 * Loads all of the signed-in user's budget data at once — it's one person's
 * savings, a few hundred rows at most — and reloads after each write rather
 * than patching local state, so every page always reads the server's truth.
 */
export function useBudget(ownerId: string): BudgetData {
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const apply = useCallback((d: Fetched) => {
    setSettings(d.settings);
    setBuckets(d.buckets);
    setTransactions(d.transactions);
    setLoaded(true);
  }, []);
  const reload = useCallback(() => fetchAll().then(apply), [apply]);

  useEffect(() => {
    // StrictMode runs this twice in dev; the SDK auto-cancels the first
    // (same requestKeys), which is expected, not an error.
    fetchAll()
      .then(apply)
      .catch((e: { isAbort?: boolean }) => {
        if (!e.isAbort) throw e;
      });
  }, [apply]);

  return {
    loaded,
    settings,
    buckets,
    transactions,
    saveSettings: async (values) => {
      if (settings) await pb.collection("budget_settings").update(settings.id, values);
      else await pb.collection("budget_settings").create({ ...values, owner: ownerId });
      await reload();
    },
    saveBucket: async (values, id) => {
      if (id) await pb.collection("budget_buckets").update(id, values);
      else {
        const sort = Math.max(0, ...buckets.map((b) => b.sort)) + 1;
        await pb.collection("budget_buckets").create({ ...values, sort, owner: ownerId });
      }
      await reload();
    },
    setArchived: async (id, archived) => {
      await pb.collection("budget_buckets").update(id, { archived });
      await reload();
    },
    addTransaction: async (values) => {
      await pb.collection("budget_transactions").create({ ...values, owner: ownerId });
      await reload();
    },
    deleteTransaction: async (id) => {
      await pb.collection("budget_transactions").delete(id);
      await reload();
    },
  };
}
