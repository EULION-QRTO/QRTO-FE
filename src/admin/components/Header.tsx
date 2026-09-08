import { formatKRW } from "@/lib/types";

export type MainTab = "tables" | "admin";

interface Props {
  storeName: string;
  todaySales: number;
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  onRefresh: () => void;
  onLogout: () => void;
}

export default function Header({
  storeName,
  todaySales,
  activeTab,
  onTabChange,
  onRefresh,
  onLogout,
}: Props) {
  return (
    <header className="header">
      <div className="header__brand">
        <span className="header__logo">을지포차</span>
        <span className="header__store">{storeName}</span>
      </div>

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
