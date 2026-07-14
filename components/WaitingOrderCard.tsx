"use client";

import {
  WaitingOrder,
  WaitStage,
  STAGE_LABEL,
  STAGES_BY_TYPE,
  orderTotal,
  formatKRW,
} from "@/lib/types";
import { agoLabel, elapsedMin } from "@/lib/time";

const WARNING_MIN = 15;

interface Props {
  order: WaitingOrder;
  now: number;
  onSetStage: (id: string, stage: WaitStage) => void;
}

export default function WaitingOrderCard({ order, now, onSetStage }: Props) {
  const isDineIn = order.type === "dine-in";
  const mins = elapsedMin(order.createdAt, now);
  const isWarning = mins >= WARNING_MIN;
  const stages = STAGES_BY_TYPE[order.type];

  const timeLabel = agoLabel(order.createdAt, now);

  return (
    <article className={`wait-card${order.isNew ? " wait-card--new" : ""}`}>
      <div className="wait-card__top">
        <span className="wait-card__label">
          {isDineIn ? `🟠 ${order.tableNumber}번 테이블` : `📦 ${order.orderNo}`}
        </span>
        <span className={`wait-card__time${isWarning ? " wait-card__time--warning" : ""}`}>
          {timeLabel}
        </span>
      </div>

      <div className="wait-card__items">
        {order.items.map((it, i) => (
          <span key={i} className="wait-card__item">
            {it.name} <strong>x{it.qty}</strong>
          </span>
        ))}
      </div>

      <hr className="wait-card__divider" />

      <div className="wait-card__foot">
        <span className="wait-card__total">{formatKRW(orderTotal(order.items))}</span>
        <select
          className={`wait-card__select wait-card__select--${order.stage}`}
          value={order.stage}
          onChange={(e) => onSetStage(order.id, e.target.value as WaitStage)}
          aria-label="주문 상태 변경"
        >
          {stages.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}
