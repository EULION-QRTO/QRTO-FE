import { useState } from "react";
import { Table, orderTotal, formatKRW } from "@/lib/types";
import { clock } from "@/lib/time";

interface Props {
  table: Table;
  onClose: () => void;
  onClear: (tableId: number) => void;
}

export default function OrderDetailModal({ table, onClose, onClear }: Props) {
  const [confirming, setConfirming] = useState(false);
  const order = table.order;
  if (!order) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      {confirming ? (
        <div className="dialog" onClick={(e) => e.stopPropagation()}>
          <p className="dialog__msg">{table.number}번 테이블을 정리하시겠습니까?</p>
          <div className="dialog__actions">
            <button className="btn btn--secondary" onClick={() => setConfirming(false)}>
              취소
            </button>
            <button
              className="btn btn--destructive"
              onClick={() => {
                onClear(table.id);
                onClose();
              }}
            >
              테이블 정리
            </button>
          </div>
        </div>
      ) : (
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal__head">
            <h2 className="modal__title">{table.number}번 테이블</h2>
            <span className="modal__sub">주문 {clock(order.startedAt)}</span>
            <button className="modal__close" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>

          <div className="modal__body">
            {order.items.map((it, i) => (
              <div className="modal__row" key={i}>
                <span>
                  <span className="modal__item-name">{it.name}</span>
                  <span className="modal__item-qty">x{it.qty}</span>
                </span>
                <span className="modal__item-price">{formatKRW(it.price * it.qty)}</span>
              </div>
            ))}

            <div className="modal__total-row">
              <span>합계</span>
              <span className="modal__total-value">{formatKRW(orderTotal(order.items))}</span>
            </div>
          </div>

          <div className="modal__foot">
            <button
              className="btn btn--destructive btn--block"
              onClick={() => setConfirming(true)}
            >
              테이블 정리
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
