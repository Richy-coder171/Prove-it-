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
import Defend from "./pages/Defend.jsx";
import Result from "./pages/Result.jsx";
import Leaderboard from "./pages/Leaderboard.jsx";
import CandidateDetail from "./pages/CandidateDetail.jsx";
import BadgePage from "./pages/BadgePage.jsx";
import PublicProfile from "./pages/PublicProfile.jsx";
import MentorQueue from "./pages/MentorQueue.jsx";
import Profile from "./pages/Profile.jsx";
import Opportunities from "./pages/Opportunities.jsx";
import VentureCreate from "./pages/VentureCreate.jsx";
import VentureCard from "./pages/VentureCard.jsx";
import CandidateMatches from "./pages/CandidateMatches.jsx";
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
        <Route path="badge/:vid" element={<BadgePage />} />
        <Route path="u/:slug" element={<PublicProfile />} />
        <Route path="venture/:id" element={<VentureCard />} />
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
          <Route path="startup/challenges/:id/leaderboard" element={<Leaderboard />} />
          <Route path="startup/challenges/:id/matches" element={<CandidateMatches />} />
          <Route path="startup/submissions/:id" element={<CandidateDetail />} />
          <Route path="startup/ventures/new" element={<VentureCreate />} />
        </Route>
        <Route element={<ProtectedRoute roles={["mentor"]} />}>
          <Route path="mentor" element={<MentorQueue />} />
        </Route>
        <Route element={<ProtectedRoute roles={["candidate"]} />}>
          <Route path="profile" element={<Profile />} />
          <Route path="opportunities" element={<Opportunities />} />
          <Route path="s/:id" element={<Solve />} />
          <Route path="s/:id/defend" element={<Defend />} />
          <Route path="s/:id/result" element={<Result />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="/home" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
