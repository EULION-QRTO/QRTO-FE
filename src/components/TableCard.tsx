import { Table, orderTotal, formatKRW } from "@/lib/types";
import { clock, elapsedMin } from "@/lib/time";

const WARNING_MIN = 60;

interface Props {
  table: Table;
  now: number;
  onOpen: (table: Table) => void;
}

export default function TableCard({ table, now, onOpen }: Props) {
  if (!table.order) {
    return (
      <div className="table-card table-card--empty" aria-label={`${table.number}번 빈 테이블`}>
        <span className="table-card__num">{table.number}</span>
      </div>
    );
  }

  const { items, startedAt } = table.order;
  const mins = elapsedMin(startedAt, now);
  const isWarning = mins >= WARNING_MIN;
  const preview =
    items.length === 1
      ? items[0].name
      : `${items[0].name} 외 ${items.length - 1}건`;

  return (
    <button
      className="table-card table-card--occupied"
      onClick={() => onOpen(table)}
      aria-label={`${table.number}번 테이블 주문 상세`}
    >
      {isWarning && <span className="table-card__warn-badge">{mins}분</span>}
      <div className="table-card__top">
        <span className="table-card__num">{table.number}번</span>
        <span className={`table-card__time${isWarning ? " table-card__time--warning" : ""}`}>
          {clock(startedAt)}
        </span>
      </div>
      <p className="table-card__preview">{preview}</p>
      <span className="table-card__total">{formatKRW(orderTotal(items))}</span>
    </button>
  );
}
