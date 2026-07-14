"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const reason = params.get("reason");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reasonMsg =
    reason === "forbidden"
      ? "접근 권한이 없는 주점입니다. 다시 로그인해 주세요."
      : reason === "auth"
      ? "로그인이 필요합니다."
      : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "로그인에 실패했습니다.");
        return;
      }
      router.replace(`/store/${data.storeId}`);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <form className="login__card" onSubmit={submit}>
        <div className="login__brand">을지포차</div>
        <p className="login__subtitle">주점 POS 로그인</p>

        {reasonMsg && <div className="login__notice">{reasonMsg}</div>}

        <label className="login__field">
          <span className="login__label">아이디</span>
          <input
            className="field"
            autoFocus
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="주점 아이디"
          />
        </label>

        <label className="login__field">
          <span className="login__label">비밀번호</span>
          <input
            className="field"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
          />
        </label>

        {error && <div className="login__error">{error}</div>}

        <button className="btn btn--primary btn--block" type="submit" disabled={loading}>
          {loading ? "확인 중..." : "로그인"}
        </button>

        <p className="login__hint">데모 계정: euljiro / hongdae / gangnam — 비밀번호 1234</p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
