import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout as clearSession } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import {
  storeApi,
  categoryApi,
  menuApi,
  tableStatusApi,
  orderApi,
  tableApi,
  salesApi,
} from "@/lib/endpoints";
import { connectRealtime } from "@/lib/realtime";
import {
  toTable,
  toWaitingOrder,
  toMenuItem,
  toSettlementAccount,
  categoryNameMap,
  categoryIdByName,
  isActiveWaiting,
  stageToStatus,
} from "@/lib/mappers";
import type { CategoryResponse, SalesSummaryResponse } from "@/lib/dto";
import Header, { MainTab } from "@/components/Header";
import TableCard from "@/components/TableCard";
import Sidebar from "@/components/Sidebar";
import OrderDetailModal from "@/components/OrderDetailModal";
import AdminPanel, { SalesSummary } from "@/components/AdminPanel";
import {
  Table,
  WaitingOrder,
  WaitStage,
  MenuItem,
  MenuCategory,
  SettlementAccount,
} from "@/lib/types";

interface Props {
  storeId: string;
  storeName: string;
}

export default function PosApp({ storeId, storeName }: Props) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<MainTab>("tables");

  const [tables, setTables] = useState<Table[]>([]);
  const [waiting, setWaiting] = useState<WaitingOrder[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [account, setAccount] = useState<SettlementAccount>({ bank: "", number: "", holder: "" });
  const [tableCount, setTableCountState] = useState<number>(0);
  const [sales, setSales] = useState<SalesSummaryResponse | null>(null);

  const [selected, setSelected] = useState<Table | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [online, setOnline] = useState(false);

  // 최신 tableId→번호 매핑 (실시간 이벤트 매핑용)
  const numMapRef = useRef<Map<number, number>>(new Map());

  /** ApiError 처리: 401 이면 로그인으로, 그 외엔 배너 표시 */
  const handleError = useCallback(
    (e: unknown, fallback: string) => {
      if (e instanceof ApiError && e.status === 401) {
        clearSession();
        navigate("/login?reason=auth", { replace: true });
        return;
      }
      const msg = e instanceof ApiError ? e.message : fallback;
      setNotice(msg);
      setTimeout(() => setNotice(null), 4000);
    },
    [navigate],
  );

  const applyTableStatus = useCallback(
    (list: Awaited<ReturnType<typeof tableStatusApi.list>>) => {
      const tbls = list.map(toTable);
      numMapRef.current = new Map(tbls.map((t) => [t.id, t.number]));
      setTables(tbls);
      return numMapRef.current;
    },
    [],
  );

  /** 테이블 현황 + 대기 주문 동시 갱신 */
  const reloadTablesAndOrders = useCallback(async () => {
    try {
      const [tsList, orders] = await Promise.all([
        tableStatusApi.list(storeId),
        orderApi.list(storeId),
      ]);
      const numMap = applyTableStatus(tsList);
      setWaiting(orders.filter(isActiveWaiting).map((o) => toWaitingOrder(o, numMap)));
    } catch (e) {
      handleError(e, "주문 현황을 불러오지 못했습니다.");
    }
  }, [storeId, applyTableStatus, handleError]);

  const reloadTables = useCallback(async () => {
    try {
      applyTableStatus(await tableStatusApi.list(storeId));
    } catch (e) {
      handleError(e, "테이블 현황을 불러오지 못했습니다.");
    }
  }, [storeId, applyTableStatus, handleError]);

  const reloadSales = useCallback(async () => {
    try {
      setSales(await salesApi.summary(storeId));
    } catch (e) {
      handleError(e, "매출 요약을 불러오지 못했습니다.");
    }
  }, [storeId, handleError]);

  /** 최초 전체 로드 */
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [store, cats, menus, tsList, orders, summary] = await Promise.all([
          storeApi.get(storeId),
          categoryApi.list(storeId),
          menuApi.list(storeId),
          tableStatusApi.list(storeId),
          orderApi.list(storeId),
          salesApi.summary(storeId),
        ]);
        if (!alive) return;
        setCategories(cats);
        const names = categoryNameMap(cats);
        setMenu(menus.map((m) => toMenuItem(m, names)));
        const numMap = applyTableStatus(tsList);
        setWaiting(orders.filter(isActiveWaiting).map((o) => toWaitingOrder(o, numMap)));
        setAccount(toSettlementAccount(store));
        setTableCountState(store.tableCount);
        setSales(summary);
      } catch (e) {
        if (alive) handleError(e, "데이터를 불러오지 못했습니다. 서버 연결을 확인해 주세요.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [storeId, applyTableStatus, handleError]);

  // 시계 갱신 (경과시간 라이브 반영)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  // 실시간(STOMP) 구독 — 주문/직원호출 이벤트 시 해당 데이터 재로드
  useEffect(() => {
    const disconnect = connectRealtime(storeId, {
      onOrder: () => {
        void reloadTablesAndOrders();
        void reloadSales();
      },
      onStaffCall: () => {
        void reloadTables();
      },
      onConnect: () => setOnline(true),
      onDisconnect: () => setOnline(false),
    });
    return disconnect;
  }, [storeId, reloadTablesAndOrders, reloadTables, reloadSales]);

  /** 주문 상태 변경 (PATCH .../orders/{id}/status) */
  const setStage = async (id: string, stage: WaitStage) => {
    try {
      await orderApi.setStatus(storeId, Number(id), stageToStatus(stage));
      await reloadTablesAndOrders();
    } catch (e) {
      handleError(e, "주문 상태를 변경하지 못했습니다.");
    }
  };

  /** 테이블 정리 (POST .../tables/{id}/clear) */
  const clearTable = async (tableId: number) => {
    try {
      await tableApi.clear(storeId, tableId);
      await Promise.all([reloadTablesAndOrders(), reloadSales()]);
    } catch (e) {
      handleError(e, "테이블을 정리하지 못했습니다.");
    }
  };

  /** 테이블 개수 변경 (PATCH /stores/{id} tableCount) */
  const setTableCount = async (count: number) => {
    try {
      const store = await storeApi.update(storeId, { tableCount: count });
      setTableCountState(store.tableCount);
      await reloadTables();
    } catch (e) {
      handleError(e, "테이블 개수를 변경하지 못했습니다.");
    }
  };

  const addMenuItem = async (name: string, price: number, category: MenuCategory) => {
    try {
      const idByName = categoryIdByName(categories);
      const categoryId = idByName.get(category) ?? categories[0]?.id;
      if (categoryId == null) {
        setNotice("카테고리가 없어 메뉴를 추가할 수 없습니다.");
        return;
      }
      const created = await menuApi.create(storeId, { categoryId, name, price });
      setMenu((prev) => [...prev, toMenuItem(created, categoryNameMap(categories))]);
    } catch (e) {
      handleError(e, "메뉴를 추가하지 못했습니다.");
    }
  };

  const updateMenuItem = async (id: string, patch: Partial<Omit<MenuItem, "id">>) => {
    // 이미지 업로드는 백엔드 미구현 → 로컬 상태로만 반영. 나머지 필드는 서버에 PATCH.
    const { image, ...rest } = patch;
    const apiPatch: { name?: string; price?: number; categoryId?: number } = {};
    if (rest.name !== undefined) apiPatch.name = rest.name;
    if (rest.price !== undefined) apiPatch.price = rest.price;
    if (rest.category !== undefined) {
      const cid = categoryIdByName(categories).get(rest.category);
      if (cid != null) apiPatch.categoryId = cid;
    }
    try {
      if (Object.keys(apiPatch).length > 0) {
        await menuApi.update(storeId, Number(id), apiPatch);
      }
      setMenu((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
      if (image !== undefined) {
        setNotice("이미지는 서버 저장이 아직 지원되지 않아 화면에만 반영됩니다.");
        setTimeout(() => setNotice(null), 4000);
      }
    } catch (e) {
      handleError(e, "메뉴를 수정하지 못했습니다.");
    }
  };

  const deleteMenuItem = async (id: string) => {
    try {
      await menuApi.remove(storeId, Number(id));
      setMenu((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      handleError(e, "메뉴를 삭제하지 못했습니다.");
    }
  };

  const saveAccount = async (acc: SettlementAccount) => {
    try {
      const store = await storeApi.update(storeId, {
        bankName: acc.bank,
        accountNumber: acc.number,
        accountHolder: acc.holder,
      });
      setAccount(toSettlementAccount(store));
    } catch (e) {
      handleError(e, "정산 계좌를 저장하지 못했습니다.");
    }
  };

  const refresh = () => {
    setNow(Date.now());
    void reloadTablesAndOrders();
    void reloadSales();
  };

  const logout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  const occupiedCount = tables.filter((t) => t.order).length;

  const salesSummary: SalesSummary = useMemo(
    () => ({
      dineInSales: sales?.dineInSales ?? 0,
      takeoutSales: sales?.takeoutSales ?? 0,
      orderCount: sales?.orderCount ?? 0,
    }),
    [sales],
  );

  const todaySales = sales?.totalSales ?? 0;

  return (
    <div className="app">
      <Header
        storeName={storeName}
        todaySales={todaySales}
        activeTab={tab}
        onTabChange={setTab}
        onRefresh={refresh}
        onLogout={logout}
      />

      {notice && <div className="app__notice">{notice}</div>}

      {tab === "tables" ? (
        <div className="app__body">
          <main className="main">
            <div className="main__head">
              <h1 className="main__title">테이블 현황</h1>
              <span className="main__meta">
                {online ? "🟢 실시간" : "⚪ 오프라인"} · 사용중 {occupiedCount} / 전체 {tables.length}
              </span>
            </div>
            {loading ? (
              <p className="main__loading">불러오는 중…</p>
            ) : (
              <div className="table-grid">
                {tables.map((t) => (
                  <TableCard key={t.id} table={t} now={now} onOpen={setSelected} />
                ))}
              </div>
            )}
          </main>

          <Sidebar orders={waiting} now={now} onSetStage={setStage} />
        </div>
      ) : (
        <div className="app__body">
          <AdminPanel
            summary={salesSummary}
            tableCount={tableCount}
            onTableCountChange={setTableCount}
            menu={menu}
            onAddMenu={addMenuItem}
            onUpdateMenu={updateMenuItem}
            onDeleteMenu={deleteMenuItem}
            account={account}
            onSaveAccount={saveAccount}
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
