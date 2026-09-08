import { formatKRW } from "@/lib/types";

export type MainTab = "tables" | "admin";

interface Props {
  storeName: string;
  todaySales: number;
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  onRefresh: () => void;
  onLogout: () => void;
  /** 영업 중 여부. undefined 면 아직 안 불러온 상태라 토글을 숨긴다. */
  open?: boolean;
  onToggleOpen?: () => void;
}

export default function Header({
  storeName,
  todaySales,
  activeTab,
  onTabChange,
  onRefresh,
  onLogout,
  open,
  onToggleOpen,
}: Props) {
  return (
    <header className="header">
      <div className="header__brand">
        <span className="header__logo">을지포차</span>
        <span className="header__store">{storeName}</span>
      </div>

      {open !== undefined && (
        <button
          className={`btn btn--sm header__open-toggle${open ? " btn--primary" : " btn--secondary"}`}
          onClick={onToggleOpen}
          title={open ? "손님 QR 주문을 막으려면 눌러 영업을 종료합니다" : "눌러서 영업을 시작합니다"}
        >
          {open ? "🟢 영업중" : "⚪ 영업종료"}
        </button>
      )}

      <div className="header__summary">
        <span className="header__summary-label">오늘 매출</span>
        <span className="header__summary-value">{formatKRW(todaySales)}</span>
      </div>

      <button className="header__refresh" onClick={onRefresh} aria-label="새로고침">
        ↻
      </button>

      <nav className="segmented" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === "tables"}
          className={`segmented__tab${activeTab === "tables" ? " segmented__tab--active" : ""}`}
          onClick={() => onTabChange("tables")}
        >
          테이블 현황
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "admin"}
          className={`segmented__tab${activeTab === "admin" ? " segmented__tab--active" : ""}`}
          onClick={() => onTabChange("admin")}
        >
          관리자
        </button>
      </nav>

      <button className="btn btn--secondary btn--sm header__logout" onClick={onLogout}>
        로그아웃
      </button>
    </header>
  );
}
