import { Navigate, Route, Routes } from "react-router-dom";
import { SiteLayout } from "./components/SiteLayout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Landing from "./pages/Landing.jsx";
import { Login, Register } from "./pages/AuthPages.jsx";
import Ethics from "./pages/Ethics.jsx";
import AppHome from "./pages/AppHome.jsx";
import NewChallenge from "./pages/NewChallenge.jsx";
import ReviewChallenge from "./pages/ReviewChallenge.jsx";
import ChallengeIntro from "./pages/ChallengeIntro.jsx";
import Solve from "./pages/Solve.jsx";
import "./workspace.css";
import "./flow.css";

function NotFound() {
  return (
    <main className="not-found">
      <p className="eyebrow">This page wandered off</p>
      <h1>
        Let’s find
        <br />
        <em>your way back.</em>
      </h1>
      <a className="button button-dark" href="/">
        Back to home
      </a>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<Landing />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="ethics" element={<Ethics />} />
        <Route path="c/:id" element={<ChallengeIntro />} />
        <Route element={<ProtectedRoute />}>
          <Route path="app" element={<AppHome />} />
        </Route>
        <Route element={<ProtectedRoute roles={["startup"]} />}>
          <Route path="startup/challenges/new" element={<NewChallenge />} />
          <Route
            path="startup/challenges/:id/review"
            element={<ReviewChallenge />}
          />
        </Route>
        <Route element={<ProtectedRoute roles={["candidate"]} />}>
          <Route path="s/:id" element={<Solve />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="/home" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
