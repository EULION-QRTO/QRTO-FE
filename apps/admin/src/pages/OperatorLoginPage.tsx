import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { operatorLogin } from "@/lib/operator";

export default function OperatorLoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const reason = params.get("reason");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reasonMsg = reason === "auth" ? "운영자 로그인이 필요합니다." : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (operatorLogin(username, password)) {
      navigate("/operator", { replace: true });
    } else {
      setError("아이디 또는 비밀번호가 올바르지 않습니다.");
    }
  };

  return (
    <div className="login login--operator">
      <form className="login__card" onSubmit={submit}>
        <div className="login__brand">서비스 모니터링</div>
        <p className="login__subtitle">운영자 관리자 로그인</p>

        {reasonMsg && <div className="login__notice">{reasonMsg}</div>}

        <label className="login__field">
          <span className="login__label">아이디</span>
          <input
            className="field"
            autoFocus
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="운영자 아이디"
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

        <button className="btn btn--primary btn--block" type="submit">
          로그인
        </button>
      </form>
    </div>
  );
}
