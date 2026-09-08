import { useState } from "react";

type StatusFilter = "all" | "paid" | "canceled" | "refunded";

/**
 * 결제·취소 내역 (틀).
 * "실질적으로 돈이 오간" 정산 내역은 결제/거래 도메인 API 가 필요하다.
 * 현재 백엔드에는 결제/거래 조회 엔드포인트가 없어, 필터 UI 와 표 골격만 제공한다.
 * 예상 엔드포인트: GET /api/stores/{id}/payments 또는 GET /api/payments?storeId=&from=&to=
 */
export default function PaymentsTab() {
  const [storeId, setStoreId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const statusLabels: Record<StatusFilter, string> = {
    all: "전체",
    paid: "결제완료",
    canceled: "취소",
    refunded: "환불",
  };

  return (
    <>
      <div className="op__section-head">
        <h2 className="op__section-title">결제 · 취소 내역</h2>
      </div>

      <div className="op__notice op__notice--pending">
        ⓘ 결제/거래 조회 API가 아직 없습니다. 실제 정산(돈이 오간 내역)을 보려면 결제 도메인
        엔드포인트(예: <code>GET /api/stores/&#123;id&#125;/payments</code>)가 필요합니다. 아래는
        연동 준비용 필터·표 골격입니다.
      </div>

      {/* 필터 */}
      <div className="op-filters">
        <label className="op-filters__field">
          <span>매장 ID</span>
          <input
            className="field field--sm"
            inputMode="numeric"
            placeholder="전체"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value.replace(/[^0-9]/g, ""))}
          />
        </label>
        <label className="op-filters__field">
          <span>시작일</span>
          <input className="field field--sm" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="op-filters__field">
          <span>종료일</span>
          <input className="field field--sm" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className="op-filters__field">
          <span>상태</span>
          <select
            className="field field--sm field--select"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
          >
            {(Object.keys(statusLabels) as StatusFilter[]).map((k) => (
              <option key={k} value={k}>
                {statusLabels[k]}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn--sm btn--primary" disabled title="API 준비 후 활성화">
          조회
        </button>
      </div>

      {/* 집계 (골격) */}
      <section className="op__kpis">
        <div className="op__kpi">
          <div className="op__kpi-label">결제 합계</div>
          <div className="op__kpi-value op__kpi-value--accent">—</div>
        </div>
        <div className="op__kpi">
          <div className="op__kpi-label">취소·환불 합계</div>
          <div className="op__kpi-value op__kpi-value--warn">—</div>
        </div>
        <div className="op__kpi">
          <div className="op__kpi-label">순 정산액</div>
          <div className="op__kpi-value">—</div>
        </div>
        <div className="op__kpi">
          <div className="op__kpi-label">거래 건수</div>
          <div className="op__kpi-value">—</div>
        </div>
      </section>

      {/* 내역 표 (골격) */}
      <div className="op__table-wrap">
        <table className="op__table">
          <thead>
            <tr>
              <th>일시</th>
              <th>매장</th>
              <th>주문번호</th>
              <th>유형</th>
              <th>결제수단</th>
              <th>금액</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="op__table-empty">
                조회할 결제 내역이 없습니다. (API 연동 대기)
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
