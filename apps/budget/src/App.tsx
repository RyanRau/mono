import { useEffect, useState } from "react";
import { AppIcon, AppShell, EmptyState, Flexbox, SideNav, Spinner } from "bluestar";
import { useAuthRecord } from "./useAuth";
import { LoginForm } from "./LoginForm";
import { AccountMenu } from "./AccountMenu";
import { AppSwitcher } from "./AppSwitcher";
import { pb } from "./pb";
import { useBudget } from "./useBudget";
import { OverviewPage } from "./OverviewPage";
import { ActivityPage } from "./ActivityPage";
import { ForecastPage } from "./ForecastPage";
import { SetupPage } from "./SetupPage";
import { DepositModal } from "./DepositModal";
import { MoveMoneyModal } from "./MoveMoneyModal";
import type { MoveKind } from "./MoveMoneyModal";

type Tab = "overview" | "activity" | "forecast" | "setup";

function App() {
  const record = useAuthRecord();
  const [granted, setGranted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!record) return;
    // Distinct requestKey: AppSwitcher fetches from this same endpoint
    // concurrently on this same page, and the PocketBase SDK auto-cancels
    // requests that share a key (by default, method+URL).
    pb.collection("registry_grants")
      .getFullList({ expand: "app", requestKey: "budget-access" })
      .then((grants) =>
        setGranted(
          record.is_admin === true ||
            grants.some((g) => (g.expand?.app as { slug?: string } | undefined)?.slug === "budget")
        )
      );
  }, [record]);

  if (!record) {
    return (
      <Flexbox direction="column" alignItems="center" style={{ padding: 32 }}>
        <LoginForm />
      </Flexbox>
    );
  }

  if (granted === false) {
    return (
      <Flexbox direction="column" alignItems="center" style={{ padding: 32 }}>
        <EmptyState title="No access" description="Ask the admin to grant you the Budget app." />
      </Flexbox>
    );
  }

  if (granted === null) return null;

  return <Budget ownerId={record.id} />;
}

function Budget({ ownerId }: { ownerId: string }) {
  const data = useBudget(ownerId);
  const [tab, setTab] = useState<Tab>("overview");
  const [depositing, setDepositing] = useState(false);
  const [moving, setMoving] = useState<{ kind: MoveKind; from?: string } | null>(null);

  return (
    <AppShell
      sideNav={
        <SideNav
          items={[
            { key: "overview", label: "Overview", icon: "home" },
            { key: "activity", label: "Activity", icon: "docs" },
            { key: "forecast", label: "Forecast", icon: "trendingUp" },
            { key: "setup", label: "Setup", icon: "settings" },
          ]}
          activeKey={tab}
          onSelect={(key) => setTab(key as Tab)}
          top={<AppSwitcher icon={<AppIcon slug="budget" size={20} />} />}
          collapsedTop={<AppIcon slug="budget" size={20} />}
          footer={<AccountMenu />}
        />
      }
    >
      {!data.loaded ? (
        <Flexbox justifyContent="center" style={{ padding: 48 }}>
          <Spinner size={28} />
        </Flexbox>
      ) : (
        <>
          {tab === "overview" && (
            <OverviewPage
              data={data}
              onDeposit={() => setDepositing(true)}
              onMove={(kind, from) => setMoving({ kind, from })}
              onSetup={() => setTab("setup")}
            />
          )}
          {tab === "activity" && <ActivityPage data={data} />}
          {tab === "forecast" && <ForecastPage data={data} />}
          {tab === "setup" && <SetupPage data={data} />}
          {depositing && <DepositModal data={data} onClose={() => setDepositing(false)} />}
          {moving && (
            <MoveMoneyModal
              data={data}
              initialKind={moving.kind}
              initialFrom={moving.from}
              onClose={() => setMoving(null)}
            />
          )}
        </>
      )}
    </AppShell>
  );
}

export default App;
