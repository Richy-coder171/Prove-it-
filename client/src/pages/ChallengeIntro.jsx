import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  FileCheck2,
  Mic2,
  ShieldCheck,
} from "lucide-react";
import { api, getApiError } from "../lib/api.js";
import { useAuth } from "../hooks/useAuth.js";

export default function ChallengeIntro() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const challengeQuery = useQuery({
    queryKey: ["public-challenge", id],
    queryFn: async () =>
      (await api.get(`/challenges/${id}`)).data.data.challenge,
  });
  const start = useMutation({
    mutationFn: async () =>
      (await api.post("/submissions/start", { challengeId: id })).data.data
        .submission,
    onSuccess: (submission) => navigate(`/s/${submission.id}`),
  });
  const switchToCandidate = useMutation({
    mutationFn: () => api.post("/auth/logout"),
    onSuccess: () => {
      queryClient.setQueryData(["auth", "me"], null);
      navigate(registerLink);
    },
  });
  const challenge = challengeQuery.data;
  const canStart = user?.role === "candidate";
  const registerLink = `/register?role=candidate&redirect=${encodeURIComponent(`/c/${id}`)}`;

  if (challengeQuery.isPending)
    return (
      <main className="challenge-intro">
        <p role="status">Loading this challenge…</p>
      </main>
    );
  if (challengeQuery.isError)
    return (
      <main className="challenge-intro">
        <p className="eyebrow">Challenge unavailable</p>
        <h1>
          This link
          <br />
          <em>isn’t open.</em>
        </h1>
        <p>{getApiError(challengeQuery.error)}</p>
        <Link className="button button-dark" to="/">
          Back to ProveIt
        </Link>
      </main>
    );

  return (
    <main className="challenge-intro">
      <section className="challenge-intro-hero">
        <p className="eyebrow">
          {challenge.mode === "founder"
            ? "Build alongside a founder"
            : "A real-world work sample"}
        </p>
        <h1>{challenge.title}</h1>
        <p className="challenge-summary">
          Show how you approach the work. You’ll have time to solve a focused
          task, then explain the choices behind your answer.
        </p>
        <div className="challenge-facts">
          <span>
            <Clock3 /> {challenge.timeLimitMinutes} minutes
          </span>
          <span>
            <BadgeCheck /> {challenge.level}
          </span>
          <span>
            <FileCheck2 /> {challenge.skill}
          </span>
        </div>
        {user && !canStart && (
          <p className="form-error" role="alert">
            This account is set up for {user.role}s. Sign in with a candidate
            account to take the challenge.
          </p>
        )}
        {canStart ? (
          <button
            className="button button-acid"
            disabled={start.isPending}
            onClick={() => start.mutate()}
          >
            {start.isPending ? "Starting your timer…" : "Start challenge"}{" "}
            <ArrowRight size={17} />
          </button>
        ) : user ? (
          <button
            className="button button-acid"
            disabled={switchToCandidate.isPending}
            onClick={() => switchToCandidate.mutate()}
          >
            {switchToCandidate.isPending
              ? "Switching account…"
              : "Sign out and continue as a candidate"}{" "}
            <ArrowRight size={17} />
          </button>
        ) : (
          <Link className="button button-acid" to={registerLink}>
            Continue as a candidate <ArrowRight size={17} />
          </Link>
        )}
        {start.isError && (
          <p className="form-error" role="alert">
            {getApiError(start.error)}
          </p>
        )}
        {switchToCandidate.isError && (
          <p className="form-error" role="alert">
            {getApiError(switchToCandidate.error)}
          </p>
        )}
        <p className="ethics-reminder">
          <ShieldCheck size={15} /> Your answer is assessed for its content.
          People make the final decision.
        </p>
      </section>
      <section className="challenge-steps">
        <article>
          <span>
            <FileCheck2 />
          </span>
          <h2>Solve</h2>
          <p>
            Work through a focused task with a clear time limit. Your answer
            saves as you go.
          </p>
        </article>
        <article>
          <span>
            <Mic2 />
          </span>
          <h2>Explain</h2>
          <p>
            Answer follow-ups about the decisions in your own work, by voice or
            in writing.
          </p>
        </article>
        <article>
          <span>
            <BadgeCheck />
          </span>
          <h2>Get clear feedback</h2>
          <p>
            See a score tied to evidence and a path to request human review.
          </p>
        </article>
      </section>
    </main>
  );
}
