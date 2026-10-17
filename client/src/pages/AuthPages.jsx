import { useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { api, getApiError } from "../lib/api.js";
import { useAuth } from "../hooks/useAuth.js";

function AuthFrame({ children, title, description, mode }) {
  return (
    <main className="auth-page">
      <aside className="auth-aside">
        <Link className="wordmark auth-mark" to="/">
          <span className="wordmark-mark">
            P<span>.</span>
          </span>
          <span>proveit</span>
        </Link>
        <div className="auth-aside-copy">
          <p className="eyebrow">A clearer signal starts here</p>
          <h1>
            Make room
            <br />
            for <em>good work.</em>
          </h1>
          <p>
            Challenges built around real work. Follow-ups that get to the
            thinking behind it.
          </p>
        </div>
        <div className="auth-aside-footer">AI recommends. Humans decide.</div>
      </aside>
      <section className="auth-content">
        <Link className="auth-back" to="/">
          <ArrowLeft size={15} /> Back to ProveIt
        </Link>
        <div className="auth-form-wrap">
          <p className="eyebrow">
            {mode === "register"
              ? "Your next chapter"
              : "Good to have you back"}
          </p>
          <h2>{title}</h2>
          <p className="auth-description">{description}</p>
          {children}
        </div>
      </section>
    </main>
  );
}

function PasswordField({ value, onChange, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field">
      <input
        required
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        minLength={autoComplete === "new-password" ? 8 : undefined}
        maxLength={128}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

export function Login() {
  const [search] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: async (credentials) =>
      (await api.post("/auth/login", credentials)).data.data.user,
    onSuccess: (user) => {
      queryClient.setQueryData(["auth", "me"], user);
      navigate(search.get("redirect") || "/app", { replace: true });
    },
  });
  const redirect = search.get("redirect");
  const { user, isLoading } = useAuth();
  const demo = useQuery({
    queryKey: ["demo-status"],
    queryFn: async () => (await api.get("/demo/status")).data.data,
    retry: false,
  });
  const demoLogin = useMutation({
    mutationFn: async (email) =>
      (await api.post("/auth/login", { email, password: demo.data.password }))
        .data.data.user,
    onSuccess: (demoUser) => {
      queryClient.setQueryData(["auth", "me"], demoUser);
      navigate(redirect || "/app", { replace: true });
    },
  });
  if (isLoading)
    return (
      <div className="route-wait" role="status">
        Checking your session…
      </div>
    );
  if (user) return <Navigate to={redirect || "/app"} replace />;
  return (
    <AuthFrame
      mode="login"
      title="Welcome back."
      description="Sign in to pick up where you left off."
    >
      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate({ email, password });
        }}
      >
        <label>
          Email address
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={254}
          />
        </label>
        <label>
          Password
          <PasswordField
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        {mutation.isError && (
          <p className="form-error" role="alert">
            {getApiError(mutation.error)}
          </p>
        )}
        <button
          className="button button-dark auth-submit"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Signing in…" : "Sign in"}{" "}
          <ArrowRight size={17} />
        </button>
      </form>
      {demo.data?.enabled && (
        <section className="demo-login">
          <p className="eyebrow">Try the seeded demo</p>
          <div>
            {[
              ["Fieldnote Startup", "fieldnote.startup@demo.proveit.test"],
              ["Founder", "fieldnote.founder@demo.proveit.test"],
              ["Pasted candidate", "pasted@demo.proveit.test"],
              ["Genuine candidate", "genuine@demo.proveit.test"],
              ["Mentor", "demo.mentor@demo.proveit.test"],
            ].map(([label, email]) => (
              <button
                key={email}
                type="button"
                disabled={demoLogin.isPending}
                onClick={() => demoLogin.mutate(email)}
              >
                {label}
              </button>
            ))}
          </div>
          {demoLogin.isError && (
            <p className="form-error" role="alert">
              {getApiError(demoLogin.error)}
            </p>
          )}
        </section>
      )}
      <p className="auth-switch">
        New to ProveIt?{" "}
        <Link to="/register">
          Create an account <ArrowRight size={14} />
        </Link>
      </p>
    </AuthFrame>
  );
}

export function Register() {
  const [search] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [role, setRole] = useState(
    ["candidate", "startup", "mentor"].includes(search.get("role"))
      ? search.get("role")
      : "candidate",
  );
  const mutation = useMutation({
    mutationFn: async (details) =>
      (await api.post("/auth/register", details)).data.data.user,
    onSuccess: (user) => {
      queryClient.setQueryData(["auth", "me"], user);
      navigate(search.get("redirect") || "/app", { replace: true });
    },
  });
  const { user, isLoading } = useAuth();
  if (isLoading)
    return (
      <div className="route-wait" role="status">
        Checking your session…
      </div>
    );
  if (user) return <Navigate to={search.get("redirect") || "/app"} replace />;
  const next = (redirect) =>
    `${location.pathname}?redirect=${encodeURIComponent(redirect)}`;
  return (
    <AuthFrame
      mode="register"
      title="Let’s get started."
      description="A few details, then you’re on your way."
    >
      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate({
            fullName,
            email,
            password,
            role,
            ...(orgName.trim() ? { orgName: orgName.trim() } : {}),
          });
        }}
      >
        <label>
          Your name
          <input
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            autoComplete="name"
            maxLength={120}
          />
        </label>
        <label>
          Email address
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            maxLength={254}
          />
        </label>
        <label>
          Password
          <PasswordField
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
          />
        </label>
        <fieldset className="role-picker">
          <legend>I’m here as a</legend>
          <div>
            {[
              ["candidate", "Candidate"],
              ["startup", "Startup"],
              ["mentor", "Mentor"],
            ].map(([value, label]) => (
              <button
                className={role === value ? "is-selected" : ""}
                key={value}
                type="button"
                aria-pressed={role === value}
                onClick={() => setRole(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        {role === "startup" && (
          <label>
            Company or team name <span className="optional">optional</span>
            <input
              value={orgName}
              onChange={(event) => setOrgName(event.target.value)}
              autoComplete="organization"
              maxLength={160}
            />
          </label>
        )}
        {mutation.isError && (
          <p className="form-error" role="alert">
            {getApiError(mutation.error)}
          </p>
        )}
        <button
          className="button button-dark auth-submit"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Creating account…" : "Create account"}{" "}
          <ArrowRight size={17} />
        </button>
      </form>
      <p className="auth-switch">
        Already have an account?{" "}
        <Link to={next(search.get("redirect") || "/app")}>
          Sign in <ArrowRight size={14} />
        </Link>
      </p>
    </AuthFrame>
  );
}
