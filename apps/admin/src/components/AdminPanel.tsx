import { useEffect, useState } from "react";
import {
  MenuItem,
  MenuCategory,
  MENU_CATEGORIES,
  DEFAULT_MENU_CATEGORY,
  SettlementAccount,
} from "@/lib/types";
import SalesSummaryCard from "@/components/SalesSummaryCard";

const MIN_TABLES = 1;
const MAX_TABLES = 60;

interface Props {
  storeId: string;
  tableCount: number;
  onTableCountChange: (count: number) => void;
  menu: MenuItem[];
  onAddMenu: (name: string, price: number, category: MenuCategory, imageFile?: File) => void;
  onUpdateMenu: (id: string, patch: Partial<Omit<MenuItem, "id" | "image">>) => void;
  /** 메뉴 이미지 업로드/제거. file=null 이면 제거. */
  onSetMenuImage: (id: string, file: File | null) => void;
  onDeleteMenu: (id: string) => void;
  account: SettlementAccount;
  onSaveAccount: (account: SettlementAccount) => void;
}

function ImagePicker({
  value,
  onPick,
  onClear,
  label,
}: {
  value?: string;
  onPick: (file: File) => void;
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
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPick(file);
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
  storeId,
  tableCount,
  onTableCountChange,
  menu,
  onAddMenu,
  onUpdateMenu,
  onSetMenuImage,
  onDeleteMenu,
  account,
  onSaveAccount,
}: Props) {
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newImageFile, setNewImageFile] = useState<File | undefined>(undefined);
  const [newImagePreview, setNewImagePreview] = useState<string | undefined>(undefined);
  const [newCategory, setNewCategory] = useState<MenuCategory>(DEFAULT_MENU_CATEGORY);

  // 새 메뉴 이미지 선택: 로컬 미리보기(objectURL) 생성 후 파일 보관
  const pickNewImage = (file: File) => {
    if (newImagePreview) URL.revokeObjectURL(newImagePreview);
    setNewImageFile(file);
    setNewImagePreview(URL.createObjectURL(file));
  };
  const clearNewImage = () => {
    if (newImagePreview) URL.revokeObjectURL(newImagePreview);
    setNewImageFile(undefined);
    setNewImagePreview(undefined);
  };

  // 정산 계좌 편집 초안 (저장 시 커밋)
  const [acctDraft, setAcctDraft] = useState<SettlementAccount>(account);
  const [acctSaved, setAcctSaved] = useState(false);
  const acctDirty =
    acctDraft.bank !== account.bank ||
    acctDraft.number !== account.number ||
    acctDraft.holder !== account.holder;
  const acctValid =
    acctDraft.bank.trim() !== "" &&
    acctDraft.number.trim() !== "" &&
    acctDraft.holder.trim() !== "";

  const saveAccount = () => {
    if (!acctValid || !acctDirty) return;
    onSaveAccount({
      bank: acctDraft.bank.trim(),
      number: acctDraft.number.trim(),
      holder: acctDraft.holder.trim(),
    });
    setAcctSaved(true);
    setTimeout(() => setAcctSaved(false), 2000);
  };

  const clamp = (n: number) =>
    Number.isFinite(n) ? Math.min(MAX_TABLES, Math.max(MIN_TABLES, n)) : MIN_TABLES;

  // 테이블 스텝퍼: 로컬에서 자유롭게 조절하고 저장 시에만 서버 반영(bulk).
  // 서버 왕복을 기다리지 않고 연속으로 늘리고 줄일 수 있다.
  const [localTableCount, setLocalTableCount] = useState(() => clamp(tableCount));
  const [tableSaved, setTableSaved] = useState(false);
  const tableDirty = localTableCount !== clamp(tableCount);

  // 서버 값이 바뀌면 로컬 초안 동기화 (저장 완료 후 포함). NaN/undefined 방어.
  useEffect(() => {
    setLocalTableCount(clamp(tableCount));
  }, [tableCount]);

  const saveTableCount = () => {
    if (!tableDirty) return;
    onTableCountChange(localTableCount);
    setTableSaved(true);
    setTimeout(() => setTableSaved(false), 2000);
  };

  const submitNew = () => {
    const name = newName.trim();
    const price = parseInt(newPrice, 10);
    if (!name || Number.isNaN(price) || price < 0) return;
    onAddMenu(name, price, newCategory, newImageFile);
    setNewName("");
    setNewPrice("");
    clearNewImage();
    setNewCategory(DEFAULT_MENU_CATEGORY);
  };

  return (
    <div className="admin">
      {/* ── 매출 요약 (날짜 조회 · CSV/XLSX 내보내기) ── */}
      <SalesSummaryCard storeId={storeId} />

      {/* ── 테이블 설정 ── */}
      <section className="admin-card">
        <h2 className="admin-card__title">테이블 설정</h2>
        <div className="admin-setting">
          <span className="admin-setting__label">테이블 개수</span>
          <div className="stepper">
            <button
              className="stepper__btn"
              onClick={() => setLocalTableCount(clamp(localTableCount - 1))}
              disabled={localTableCount <= MIN_TABLES}
              aria-label="테이블 개수 감소"
            >
              −
            </button>
            <span className="stepper__value">{localTableCount}</span>
            <button
              className="stepper__btn"
              onClick={() => setLocalTableCount(clamp(localTableCount + 1))}
              disabled={localTableCount >= MAX_TABLES}
              aria-label="테이블 개수 증가"
            >
              +
            </button>
          </div>
          <button
            className="btn btn--primary btn--sm"
            onClick={saveTableCount}
            disabled={!tableDirty}
          >
            저장
          </button>
          <span className="admin-setting__hint">
            {tableSaved
              ? "✓ 저장되었습니다"
              : "저장을 눌러야 서버와 POS 화면에 반영됩니다. 개수를 줄이면 뒷번호 테이블의 진행중 주문도 함께 삭제됩니다."}
          </span>
        </div>
      </section>

      {/* ── 정산 계좌 ── */}
      <section className="admin-card">
        <h2 className="admin-card__title">정산 계좌</h2>
        <p className="admin-card__desc">
          주문 후 고객이 송금할 계좌입니다. 고객 주문 화면의 송금 안내에 연결됩니다.
        </p>
        <div className="account-form">
          <label className="account-field">
            <span className="account-field__label">은행</span>
            <input
              className="field"
              placeholder="예: 국민은행"
              value={acctDraft.bank}
              onChange={(e) => setAcctDraft((d) => ({ ...d, bank: e.target.value }))}
            />
          </label>
          <label className="account-field">
            <span className="account-field__label">계좌번호</span>
            <input
              className="field"
              inputMode="numeric"
              placeholder="'-' 없이 숫자만"
              value={acctDraft.number}
              onChange={(e) =>
                setAcctDraft((d) => ({ ...d, number: e.target.value.replace(/[^0-9-]/g, "") }))
              }
            />
          </label>
          <label className="account-field">
            <span className="account-field__label">예금주</span>
            <input
              className="field"
              placeholder="예금주명"
              value={acctDraft.holder}
              onChange={(e) => setAcctDraft((d) => ({ ...d, holder: e.target.value }))}
            />
          </label>
        </div>
        <div className="account-form__foot">
          <span className="account-form__status">
            {acctSaved
              ? "✓ 저장되었습니다"
              : account.number
                ? `현재: ${account.bank} ${account.number} (${account.holder})`
                : "등록된 계좌가 없습니다"}
          </span>
          <button
            className="btn btn--primary btn--sm"
            onClick={saveAccount}
            disabled={!acctValid || !acctDirty}
          >
            저장
          </button>
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
            value={newImagePreview}
            onPick={pickNewImage}
            onClear={clearNewImage}
            label="메뉴 사진 첨부 (선택)"
          />
          <select
            className="field field--select"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as MenuCategory)}
            aria-label="카테고리"
          >
            {MENU_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
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
                onPick={(file) => onSetMenuImage(item.id, file)}
                onClear={() => onSetMenuImage(item.id, null)}
                label={`${item.name} 사진`}
              />
              <select
                className="field field--select"
                value={item.category}
                onChange={(e) =>
                  onUpdateMenu(item.id, { category: e.target.value as MenuCategory })
                }
                aria-label={`${item.name} 카테고리`}
              >
                {MENU_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
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
