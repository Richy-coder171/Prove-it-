import { Navigate, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, RotateCw } from "lucide-react";
import { api, getApiError } from "../lib/api.js";

export default function Demo() {
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: ["demo-status"],
    queryFn: async () => (await api.get("/demo/status")).data.data,
  });
  const reset = useMutation({
    mutationFn: async () => (await api.post("/demo/reset")).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demo-status"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
  if (status.isPending)
    return (
      <main className="demo-page">
        <p role="status">Checking demo mode…</p>
      </main>
    );
  if (status.isError || !status.data.enabled)
    return <Navigate to="/" replace />;
  return (
    <main className="demo-page">
      <p className="eyebrow">ProveIt · seeded demo</p>
      <h1>Show the work behind the result.</h1>
      <p>
        Use the seeded accounts to compare two different defenses, explore the
        leaderboard, and verify a signed badge. Demo password:{" "}
        <code>{status.data.password}</code>
      </p>
      <div className="demo-actions">
        <button
          className="button button-dark"
          disabled={reset.isPending}
          onClick={() => reset.mutate()}
        >
          <RotateCw size={15} />{" "}
          {reset.isPending ? "Resetting…" : "Reset demo data"}
        </button>
        {reset.isError && (
          <p className="form-error" role="alert">
            {getApiError(reset.error)}
          </p>
        )}
        {status.data.challengeId && (
          <Link
            className="button button-outline"
            to={`/startup/challenges/${status.data.challengeId}/leaderboard`}
          >
            Jump to leaderboard <ArrowUpRight size={15} />
          </Link>
        )}
        {status.data.sampleBadgeId && (
          <Link
            className="button button-outline"
            to={`/badge/${status.data.sampleBadgeId}`}
          >
            Open sample badge <ArrowUpRight size={15} />
          </Link>
        )}
        {status.data.ventureId && (
          <Link
            className="button button-outline"
            to={`/venture/${status.data.ventureId}`}
          >
            Open Venture Card <ArrowUpRight size={15} />
          </Link>
        )}
      </div>
      <section className="demo-accounts">
        <article>
          <h2>Startup</h2>
          <p>Review and shortlist candidate submissions.</p>
          <Link to="/login">Sign in as startup</Link>
        </article>
        <article>
          <h2>Pasted</h2>
          <p>See a polished answer with less specific defense.</p>
          <Link to="/login">Sign in as Pasted</Link>
        </article>
        <article>
          <h2>Genuine</h2>
          <p>Compare specific explanations tied to the work.</p>
          <Link to="/login">Sign in as Genuine</Link>
        </article>
        <article>
          <h2>Mentor</h2>
          <p>Open an anonymized review queue.</p>
          <Link to="/login">Sign in as mentor</Link>
        </article>
      </section>
    </main>
  );
}
