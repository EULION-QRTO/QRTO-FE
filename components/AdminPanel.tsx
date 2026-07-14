"use client";

import { useState } from "react";
import { MenuItem, formatKRW } from "@/lib/types";

export interface SalesSummary {
  dineInSales: number;
  takeoutSales: number;
  orderCount: number;
}

const MIN_TABLES = 1;
const MAX_TABLES = 60;

interface Props {
  summary: SalesSummary;
  tableCount: number;
  onTableCountChange: (count: number) => void;
  menu: MenuItem[];
  onAddMenu: (name: string, price: number, image?: string) => void;
  onUpdateMenu: (id: string, patch: Partial<Omit<MenuItem, "id">>) => void;
  onDeleteMenu: (id: string) => void;
}

/** 파일 → data URL */
const readImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

function ImagePicker({
  value,
  onPick,
  onClear,
  label,
}: {
  value?: string;
  onPick: (dataUrl: string) => void;
  onClear?: () => void;
  label: string;
}) {
  return (
    <div className="thumb-wrap">
      <label className="thumb" title={label} aria-label={label}>
        {value ? (
          <img src={value} alt="" className="thumb__img" />
        ) : (
          <span className="thumb__ph">📷</span>
        )}
        <input
          type="file"
          accept="image/*"
          className="thumb__input"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) onPick(await readImage(file));
            e.target.value = "";
          }}
        />
      </label>
      {value && onClear && (
        <button type="button" className="thumb__clear" onClick={onClear} aria-label="사진 제거">
          ✕
        </button>
      )}
    </div>
  );
}

export default function AdminPanel({
  summary,
  tableCount,
  onTableCountChange,
  menu,
  onAddMenu,
  onUpdateMenu,
  onDeleteMenu,
}: Props) {
  const total = summary.dineInSales + summary.takeoutSales;
  const avg = summary.orderCount > 0 ? Math.round(total / summary.orderCount) : 0;

  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newImage, setNewImage] = useState<string | undefined>(undefined);

  const clamp = (n: number) => Math.min(MAX_TABLES, Math.max(MIN_TABLES, n));

  const submitNew = () => {
    const name = newName.trim();
    const price = parseInt(newPrice, 10);
    if (!name || Number.isNaN(price) || price < 0) return;
    onAddMenu(name, price, newImage);
    setNewName("");
    setNewPrice("");
    setNewImage(undefined);
  };

  return (
    <div className="admin">
      {/* ── 오늘 매출 ── */}
      <section className="admin-card">
        <h2 className="admin-card__title">오늘 매출</h2>
        <div className="admin__total-value">{formatKRW(total)}</div>
        <div className="admin__grid">
          <div className="admin__stat">
            <div className="admin__stat-label">🟠 현장 주문 매출</div>
            <div className="admin__stat-value">{formatKRW(summary.dineInSales)}</div>
          </div>
          <div className="admin__stat">
            <div className="admin__stat-label">📦 포장 주문 매출</div>
            <div className="admin__stat-value">{formatKRW(summary.takeoutSales)}</div>
          </div>
          <div className="admin__stat">
            <div className="admin__stat-label">총 주문 건수</div>
            <div className="admin__stat-value">{summary.orderCount.toLocaleString("ko-KR")}건</div>
          </div>
          <div className="admin__stat">
            <div className="admin__stat-label">평균 객단가</div>
            <div className="admin__stat-value admin__stat-value--accent">{formatKRW(avg)}</div>
          </div>
        </div>
      </section>

      {/* ── 테이블 설정 ── */}
      <section className="admin-card">
        <h2 className="admin-card__title">테이블 설정</h2>
        <div className="admin-setting">
          <span className="admin-setting__label">테이블 개수</span>
          <div className="stepper">
            <button
              className="stepper__btn"
              onClick={() => onTableCountChange(clamp(tableCount - 1))}
              disabled={tableCount <= MIN_TABLES}
              aria-label="테이블 개수 감소"
            >
              −
            </button>
            <span className="stepper__value">{tableCount}</span>
            <button
              className="stepper__btn"
              onClick={() => onTableCountChange(clamp(tableCount + 1))}
              disabled={tableCount >= MAX_TABLES}
              aria-label="테이블 개수 증가"
            >
              +
            </button>
          </div>
          <span className="admin-setting__hint">
            개수를 줄이면 뒷번호 테이블의 진행중 주문도 함께 삭제됩니다.
          </span>
        </div>
      </section>

      {/* ── 메뉴 관리 ── */}
      <section className="admin-card">
        <div className="admin-card__head">
          <h2 className="admin-card__title">메뉴 관리</h2>
          <span className="admin-card__count">{menu.length}개</span>
        </div>

        <div className="menu-add">
          <ImagePicker
            value={newImage}
            onPick={setNewImage}
            onClear={() => setNewImage(undefined)}
            label="메뉴 사진 첨부 (선택)"
          />
          <input
            className="field field--grow"
            placeholder="메뉴명"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitNew()}
          />
          <input
            className="field field--price"
            type="number"
            min={0}
            placeholder="가격"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitNew()}
          />
          <button className="btn btn--primary btn--sm" onClick={submitNew}>
            추가
          </button>
        </div>

        <ul className="menu-list">
          {menu.length === 0 && <li className="menu-list__empty">등록된 메뉴가 없습니다</li>}
          {menu.map((item) => (
            <li className="menu-row" key={item.id}>
              <ImagePicker
                value={item.image}
                onPick={(dataUrl) => onUpdateMenu(item.id, { image: dataUrl })}
                onClear={() => onUpdateMenu(item.id, { image: undefined })}
                label={`${item.name} 사진`}
              />
              <input
                className="field field--grow"
                value={item.name}
                onChange={(e) => onUpdateMenu(item.id, { name: e.target.value })}
                aria-label="메뉴명"
              />
              <div className="field field--price-wrap">
                <input
                  className="field field--price"
                  type="number"
                  min={0}
                  value={item.price}
                  onChange={(e) => onUpdateMenu(item.id, { price: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                  aria-label="가격"
                />
                <span className="field__suffix">원</span>
              </div>
              <button
                className="menu-row__del"
                onClick={() => onDeleteMenu(item.id)}
                aria-label={`${item.name} 삭제`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
