import { useCallback, useEffect, useState } from "react";
import { formatKRW } from "@/lib/types";
import {
  getManagedStores,
  setManagedStores,
  type ManagedStore,
} from "@/lib/operator";
import { syncStoresFromServer } from "@/lib/storeRegistry";
import { fetchSnapshot, type StoreSnapshot } from "./storeSnapshot";

interface Props {
  /** QR 인쇄 탭으로 이동 (해당 매장 ID prefill) */
  onPrintQr: (id: string) => void;
}

/** 매장 표시명: 백엔드 조회명 > 로컬 라벨 > 매장 #id */
const displayName = (store: ManagedStore, snap?: StoreSnapshot) =>
  snap?.name ?? store.name ?? `매장 #${store.id}`;

export default function StoreListTab({ onPrintQr }: Props) {
  const [stores, setStores] = useState<ManagedStore[]>(() => getManagedStores());
  const [snapshots, setSnapshots] = useState<Record<string, StoreSnapshot>>({});
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 추가 폼
  const [addId, setAddId] = useState("");
  const [addName, setAddName] = useState("");
  const [addOrg, setAddOrg] = useState("");

  // 상세 편집 초안
  const [editName, setEditName] = useState("");
  const [editOrg, setEditOrg] = useState("");

  const persist = (next: ManagedStore[]) => {
    setStores(next);
    setManagedStores(next);
  };

  const refresh = useCallback(async () => {
    const ids = stores.map((s) => s.id);
    setLoading(true);
    const results = await Promise.all(ids.map(fetchSnapshot));
    setSnapshots(Object.fromEntries(results.map((s) => [s.id, s])));
    setLoading(false);
  }, [stores]);

  // 마운트 시 서버 매장 목록과 동기화(가능하면). 실패하면 로컬 그대로.
  useEffect(() => {
    let alive = true;
    void syncStoresFromServer().then((merged) => {
      if (alive && merged) setStores(merged);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addStore = () => {
    const id = addId.trim();
    if (!id || stores.some((s) => s.id === id)) {
      setAddId("");
      return;
    }
    // 숫자 ID = 이미 서버에 존재하는 매장을 추적 → synced
    persist([
      ...stores,
      { id, name: addName.trim() || undefined, org: addOrg.trim() || undefined, synced: true },
    ]);
    setAddId("");
    setAddName("");
    setAddOrg("");
  };

  const removeStore = (id: string) => {
    persist(stores.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const openDetail = (store: ManagedStore) => {
    setSelectedId(store.id);
    setEditName(store.name ?? "");
    setEditOrg(store.org ?? "");
  };

  const saveMeta = () => {
    if (!selectedId) return;
    persist(
      stores.map((s) =>
        s.id === selectedId
          ? { ...s, name: editName.trim() || undefined, org: editOrg.trim() || undefined }
          : s,
      ),
    );
  };

  // 검색: 표시명 · 운영단체 · ID 부분일치
  const q = query.trim().toLowerCase();
  const filtered = stores.filter((s) => {
    if (!q) return true;
    const snap = snapshots[s.id];
    return (
      displayName(s, snap).toLowerCase().includes(q) ||
      (s.org ?? "").toLowerCase().includes(q) ||
      s.id.includes(q)
    );
  });

  const selected = selectedId ? stores.find((s) => s.id === selectedId) : null;
  const selectedSnap = selectedId ? snapshots[selectedId] : undefined;

  return (
    <>
      <div className="op__section-head">
        <h2 className="op__section-title">매장 리스트</h2>
        <span className="op__count">{stores.length}</span>
        <span className="op__updated">{loading ? "갱신 중…" : ""}</span>
        <button className="btn btn--sm" onClick={() => void refresh()} disabled={loading}>
          새로고침
        </button>
      </div>

      {/* 검색 */}
      <div className="op__add">
        <input
          className="field field--sm op__store-search"
          placeholder="매장 이름 · 운영단체 · ID 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* 매장 추가 */}
      <div className="op-form op-form--inline">
        <input
          className="field field--sm"
          placeholder="매장 ID"
          inputMode="numeric"
          value={addId}
          onChange={(e) => setAddId(e.target.value.replace(/[^0-9]/g, ""))}
        />
        <input
          className="field field--sm"
          placeholder="이름(선택)"
          value={addName}
          onChange={(e) => setAddName(e.target.value)}
        />
        <input
          className="field field--sm"
          placeholder="운영단체(선택)"
          value={addOrg}
          onChange={(e) => setAddOrg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addStore()}
        />
        <button className="btn btn--sm btn--primary" onClick={addStore} disabled={!addId.trim()}>
          매장 추가
        </button>
      </div>

      {/* 목록 */}
      <div className="op__table-wrap">
        <table className="op__table">
          <thead>
            <tr>
              <th>매장</th>
              <th>운영단체</th>
              <th>ID</th>
              <th>상태</th>
              <th>오늘 매출</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="op__table-empty">
                  {stores.length === 0 ? "관리 중인 매장이 없습니다. 위에서 추가하세요." : "검색 결과가 없습니다."}
                </td>
              </tr>
            ) : (
              filtered.map((s) => {
                const snap = snapshots[s.id];
                return (
                  <tr
                    key={s.id}
                    className={`op__row${selectedId === s.id ? " op__row--active" : ""}`}
                    onClick={() => openDetail(s)}
                  >
                    <td>{displayName(s, snap)}</td>
                    <td>{s.org ?? "—"}</td>
                    <td>#{s.id}</td>
                    <td>
                      {!snap ? (
                        <span className="op__badge">…</span>
                      ) : snap.online ? (
                        <span className="op__badge op__badge--on">정상</span>
                      ) : (
                        <span className="op__badge op__badge--off">오프라인</span>
                      )}
                    </td>
                    <td>{snap?.online ? formatKRW(snap.totalSales ?? 0) : "—"}</td>
                    <td>
                      <button
                        className="op__link-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeStore(s.id);
                        }}
                      >
                        제거
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 상세 관리 패널 */}
      {selected && (
        <section className="op-detail">
          <div className="op-detail__head">
            <h3 className="op-detail__title">
              {displayName(selected, selectedSnap)} <span className="op-card__id">#{selected.id}</span>
            </h3>
            <span className={`op__badge${selected.synced ? " op__badge--on" : " op__badge--off"}`}>
              {selected.synced ? "서버 저장됨" : "로컬 전용"}
            </span>
            <button className="op-card__remove" onClick={() => setSelectedId(null)} aria-label="닫기">
              ✕
            </button>
          </div>

          {selectedSnap && !selectedSnap.online && (
            <p className="op-card__error">⚠️ {selectedSnap.error}</p>
          )}

          {selectedSnap?.online && (
            <div className="op-card__stats op-detail__stats">
              <div>
                <span className="op-card__stat-label">오늘 매출</span>
                <span className="op-card__stat-value">{formatKRW(selectedSnap.totalSales ?? 0)}</span>
              </div>
              <div>
                <span className="op-card__stat-label">진행 주문</span>
                <span className="op-card__stat-value">{selectedSnap.activeOrders}건</span>
              </div>
              <div>
                <span className="op-card__stat-label">테이블</span>
                <span className="op-card__stat-value">
                  {selectedSnap.occupied}/{selectedSnap.tableCount}
                </span>
              </div>
              <div>
                <span className="op-card__stat-label">직원호출</span>
                <span className="op-card__stat-value">{selectedSnap.staffCalls}</span>
              </div>
              <div>
                <span className="op-card__stat-label">주문/취소</span>
                <span className="op-card__stat-value">
                  {selectedSnap.orderCount}/{selectedSnap.canceledCount}
                </span>
              </div>
            </div>
          )}

          {/* 메타데이터 편집 (로컬) */}
          <div className="op-detail__meta">
            <label className="op-form__field">
              <span className="op-form__label">표시 이름(로컬)</span>
              <input className="field field--sm" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="백엔드 매장명 사용 시 비움" />
            </label>
            <label className="op-form__field">
              <span className="op-form__label">운영단체</span>
              <input className="field field--sm" value={editOrg} onChange={(e) => setEditOrg(e.target.value)} placeholder="예: 멋쟁이사자처럼 LPAY" />
            </label>
            <button className="btn btn--sm" onClick={saveMeta}>
              메타 저장
            </button>
          </div>

          <div className="op-detail__actions">
            <button className="btn btn--sm btn--primary" onClick={() => onPrintQr(selected.id)}>
              🖨 QR 인쇄
            </button>
            <button className="btn btn--sm btn--destructive" onClick={() => removeStore(selected.id)}>
              목록에서 제거
            </button>
          </div>
        </section>
      )}
    </>
  );
}
