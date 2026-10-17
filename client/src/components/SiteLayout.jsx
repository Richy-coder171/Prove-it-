import { useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import { useAuth } from "../hooks/useAuth.js";

export function SiteLayout() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthPage = ["/login", "/register"].includes(location.pathname);
  const isLightHeader = location.pathname !== "/";
  const logout = useMutation({
    mutationFn: () => api.post("/auth/logout"),
    onSuccess: () => {
      queryClient.setQueryData(["auth", "me"], null);
      navigate("/");
    },
  });

  return (
    <div className="site-shell">
      {!isAuthPage && (
        <header
          className={`site-header ${isLightHeader ? "site-header-light" : ""}`}
        >
          <Link to="/" className="wordmark" aria-label="ProveIt home">
            <span className="wordmark-mark">
              P<span>.</span>
            </span>
            <span>proveit</span>
          </Link>
          <button
            className="menu-toggle"
            type="button"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
          <nav
            className={`main-nav ${open ? "is-open" : ""}`}
            aria-label="Main navigation"
          >
            <NavLink onClick={() => setOpen(false)} to="/ethics">
              Our approach
            </NavLink>
            <a onClick={() => setOpen(false)} href="/#how-it-works">
              How it works
            </a>
            {user ? (
              <>
                <Link className="nav-user" to="/app">
                  {user.fullName}
                </Link>
                <button
                  className="nav-signout"
                  onClick={() => logout.mutate()}
                  disabled={logout.isPending}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)}>
                  Log in
                </Link>
                <Link
                  className="nav-cta"
                  to="/register"
                  onClick={() => setOpen(false)}
                >
                  Get started <ArrowUpRight size={15} />
                </Link>
              </>
            )}
          </nav>
        </header>
      )}
      <Outlet />
      <footer className="site-footer">
        <div className="footer-main">
          <Link to="/" className="wordmark footer-wordmark">
            <span className="wordmark-mark">
              P<span>.</span>
            </span>
            <span>proveit</span>
          </Link>
          <p>Good work deserves a chance to speak for itself.</p>
          <Link to="/ethics">
            AI recommends. Humans decide. <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} ProveIt</span>
          <span>Built for the work ahead.</span>
        </div>
      </footer>
    </div>
  );
}
