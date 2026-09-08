import { useState } from "react";
import { getManagedStores, removeManagedStore, type ManagedStore } from "@/lib/operator";
import { createStore } from "@/lib/storeRegistry";

/**
 * 매장 등록 — 로컬 우선 + 서버 동기화.
 * 서버 생성 API(POST /api/stores)가 있으면 서버에 저장되고, 없으면 로컬에만 저장된다.
 * 등록된 매장은 '매장 리스트'·'개요'에 즉시 반영된다.
 */
export default function StoreRegisterTab() {
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [takeoutEnabled, setTakeoutEnabled] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [stores, setStores] = useState<ManagedStore[]>(() => getManagedStores());

  const pwMismatch = password2 !== "" && password !== password2;
  const valid =
    name.trim() !== "" &&
    username.trim() !== "" &&
    password !== "" &&
    password === password2 &&
    adminPassword !== "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setResult(null);
    const res = await createStore(
      {
        name: name.trim(),
        org: org.trim() || undefined,
        takeoutEnabled,
        username: username.trim(),
        password,
      },
      adminPassword,
    );
    setStores(getManagedStores());
    setResult(
      res.syncedToServer
        ? { ok: true, msg: `서버에 등록되었습니다 (매장 #${res.store.id}, 아이디 ${username.trim()}).` }
        : {
            ok: false,
            msg: `로컬에만 저장되었습니다(아이디만 보관, 비밀번호 미저장). 서버 저장 실패: ${res.error ?? "알 수 없는 오류"}`,
          },
    );
    setName("");
    setOrg("");
    setTakeoutEnabled(true);
    setUsername("");
    setPassword("");
    setPassword2("");
    setBusy(false);
  };

  const remove = (id: string) => {
    removeManagedStore(id);
    setStores(getManagedStores());
  };

  return (
    <>
      <div className="op__section-head">
        <h2 className="op__section-title">매장 등록</h2>
      </div>

      <div className="op__notice op__notice--pending">
        ⓘ 운영자가 주점 <strong>로그인 아이디·비밀번호를 사전 설정</strong>합니다. 매장은 로컬에
        즉시 저장되고, <strong>총관리자 비밀번호</strong>가 맞으면 서버(<code>POST /api/stores</code>)에도
        저장됩니다(포스 로그인 비밀번호·총관리자 비밀번호 모두 서버 전송용으로만 쓰고{" "}
        <strong>로컬에는 저장하지 않음</strong>).
      </div>

      <form className="op-form" onSubmit={submit}>
        <label className="op-form__field">
          <span className="op-form__label">주점 이름</span>
          <input
            className="field"
            placeholder="예: 을지로 포차"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="op-form__field">
          <span className="op-form__label">운영단체</span>
          <input
            className="field"
            placeholder="예: 멋쟁이사자처럼 LPAY"
            value={org}
            onChange={(e) => setOrg(e.target.value)}
          />
        </label>
        <label className="op-form__field">
          <span className="op-form__label">로그인 아이디</span>
          <input
            className="field"
            autoComplete="off"
            placeholder="주점 로그인 아이디"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className="op-form__field">
          <span className="op-form__label">비밀번호</span>
          <input
            className="field"
            type="password"
            autoComplete="new-password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label className="op-form__field">
          <span className="op-form__label">비밀번호 확인</span>
          <input
            className={`field${pwMismatch ? " field--error" : ""}`}
            type="password"
            autoComplete="new-password"
            placeholder="비밀번호 재입력"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
          />
        </label>
        <label className="op-form__check">
          <input
            type="checkbox"
            checked={takeoutEnabled}
            onChange={(e) => setTakeoutEnabled(e.target.checked)}
          />
          <span>포장(TOGO) 주문 사용</span>
        </label>
        <label className="op-form__field">
          <span className="op-form__label">총관리자 비밀번호</span>
          <input
            className="field"
            type="password"
            autoComplete="off"
            placeholder="서버에 저장하려면 필요 (X-Admin-Password)"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
          />
        </label>
        <button className="btn btn--primary" type="submit" disabled={!valid || busy}>
          {busy ? "등록 중…" : "등록"}
        </button>
        {pwMismatch && <span className="op-form__err">비밀번호가 일치하지 않습니다.</span>}
      </form>

      {result && (
        <p className={`op__result${result.ok ? " op__result--ok" : " op__result--warn"}`}>
          {result.ok ? "✓ " : "⚠️ "}
          {result.msg}
        </p>
      )}

      <div className="op__section-head op__section-head--sub">
        <h3 className="op__subtitle">등록된 매장</h3>
        <span className="op__count">{stores.length}</span>
      </div>

      {stores.length === 0 ? (
        <p className="op__empty">등록된 매장이 없습니다.</p>
      ) : (
        <div className="op__table-wrap">
          <table className="op__table">
            <thead>
              <tr>
                <th>주점 이름</th>
                <th>운영단체</th>
                <th>로그인 아이디</th>
                <th>ID</th>
                <th>포장</th>
                <th>저장</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {stores.map((s) => (
                <tr key={s.id}>
                  <td>{s.name ?? `매장 #${s.id}`}</td>
                  <td>{s.org ?? "—"}</td>
                  <td>{s.username ?? "—"}</td>
                  <td>#{s.id}</td>
                  <td>{s.takeoutEnabled === false ? "미사용" : "사용"}</td>
                  <td>
                    {s.synced ? (
                      <span className="op__badge op__badge--on">서버</span>
                    ) : (
                      <span className="op__badge op__badge--off">로컬</span>
                    )}
                  </td>
                  <td>
                    <button className="op__link-btn" onClick={() => remove(s.id)}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
