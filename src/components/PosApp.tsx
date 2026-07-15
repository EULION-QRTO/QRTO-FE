import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout as clearSession } from "@/lib/auth";
import Header, { MainTab } from "@/components/Header";
import TableCard from "@/components/TableCard";
import Sidebar from "@/components/Sidebar";
import OrderDetailModal from "@/components/OrderDetailModal";
import AdminPanel, { SalesSummary } from "@/components/AdminPanel";
import { Table, WaitingOrder, WaitStage, MenuItem, SettlementAccount, TERMINAL_STAGE, orderTotal } from "@/lib/types";
import { initialTables, initialWaiting, sampleNewOrders, initialMenu, initialAccount } from "@/lib/mockData";

interface Props {
  storeName: string;
}

export default function PosApp({ storeName }: Props) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<MainTab>("tables");
  const [tables, setTables] = useState<Table[]>(initialTables);
  const [waiting, setWaiting] = useState<WaitingOrder[]>(initialWaiting);
  const [menu, setMenu] = useState<MenuItem[]>(initialMenu);
  const [account, setAccount] = useState<SettlementAccount>(initialAccount);
  const [selected, setSelected] = useState<Table | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  // 시계 갱신 (경과시간 라이브 반영)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  // 신규 주문 도착 시뮬레이션 (리스트 최상단 삽입 + 하이라이트)
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      const tpl = sampleNewOrders[i % sampleNewOrders.length];
      i += 1;
      const order: WaitingOrder = {
        ...tpl,
        id: `sim-${Date.now()}`,
        createdAt: Date.now(),
        isNew: true,
      };
      setWaiting((prev) => [order, ...prev]);
      setTimeout(() => {
        setWaiting((prev) => prev.map((o) => (o.id === order.id ? { ...o, isNew: false } : o)));
      }, 1500);
    }, 20000);
    return () => clearInterval(t);
  }, []);

  const setStage = (id: string, stage: WaitStage) => {
    setWaiting((prev) =>
      prev.flatMap((o) => {
        if (o.id !== id) return [o];
        if (stage === TERMINAL_STAGE[o.type]) return [];
        return [{ ...o, stage }];
      })
    );
  };

  const clearTable = (tableId: number) => {
    setTables((prev) => prev.map((t) => (t.id === tableId ? { ...t, order: null } : t)));
  };

  const setTableCount = (count: number) => {
    setTables((prev) =>
      Array.from({ length: count }, (_, i) => {
        const number = i + 1;
        return prev.find((t) => t.number === number) ?? { id: number, number, order: null };
      })
    );
  };

  const addMenuItem = (name: string, price: number, image?: string) => {
    setMenu((prev) => [...prev, { id: `menu-${Date.now()}`, name, price, image }]);
  };
  const updateMenuItem = (id: string, patch: Partial<Omit<MenuItem, "id">>) => {
    setMenu((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };
  const deleteMenuItem = (id: string) => {
    setMenu((prev) => prev.filter((m) => m.id !== id));
  };

  const logout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  const occupiedCount = tables.filter((t) => t.order).length;

  const salesSummary: SalesSummary = useMemo(() => {
    const dineInSales = tables.reduce(
      (sum, t) => sum + (t.order ? orderTotal(t.order.items) : 0),
      0
    );
    const takeoutSales = waiting
      .filter((o) => o.type === "takeout")
      .reduce((sum, o) => sum + orderTotal(o.items), 0);
    return {
      dineInSales,
      takeoutSales,
      orderCount: occupiedCount + waiting.filter((o) => o.type === "takeout").length,
    };
  }, [tables, waiting, occupiedCount]);

  const todaySales = salesSummary.dineInSales + salesSummary.takeoutSales;

  return (
    <div className="app">
      <Header
        storeName={storeName}
        todaySales={todaySales}
        activeTab={tab}
        onTabChange={setTab}
        onRefresh={() => setNow(Date.now())}
        onLogout={logout}
      />

      {tab === "tables" ? (
        <div className="app__body">
          <main className="main">
            <div className="main__head">
              <h1 className="main__title">테이블 현황</h1>
              <span className="main__meta">
                사용중 {occupiedCount} / 전체 {tables.length}
              </span>
            </div>
            <div className="table-grid">
              {tables.map((t) => (
                <TableCard key={t.id} table={t} now={now} onOpen={setSelected} />
              ))}
            </div>
          </main>

          <Sidebar orders={waiting} now={now} onSetStage={setStage} />
        </div>
      ) : (
        <div className="app__body">
          <AdminPanel
            summary={salesSummary}
            tableCount={tables.length}
            onTableCountChange={setTableCount}
            menu={menu}
            onAddMenu={addMenuItem}
            onUpdateMenu={updateMenuItem}
            onDeleteMenu={deleteMenuItem}
            account={account}
            onSaveAccount={setAccount}
          />
        </div>
      )}

      {selected && (
        <OrderDetailModal
          table={selected}
          onClose={() => setSelected(null)}
          onClear={clearTable}
        />
      )}
    </div>
  );
}
