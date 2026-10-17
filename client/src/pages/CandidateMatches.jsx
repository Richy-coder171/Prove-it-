import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { api, getApiError } from "../lib/api.js";

export default function CandidateMatches() {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ["candidate-matches", id],
    queryFn: async () =>
      (await api.get("/candidates/match", { params: { challengeId: id } })).data
        .data.candidates,
  });
  if (query.isPending)
    return (
      <main className="leaderboard-page">
        <p role="status">Matching candidate skills…</p>
      </main>
    );
  if (query.isError)
    return (
      <main className="leaderboard-page">
        <p role="alert">{getApiError(query.error)}</p>
      </main>
    );
  return (
    <main className="leaderboard-page">
      <Link className="text-link" to={`/startup/challenges/${id}/leaderboard`}>
        <ArrowLeft size={14} /> Leaderboard
      </Link>
      <p className="eyebrow">Reverse matching</p>
      <h1>Skills that fit the work.</h1>
      <section className="leaderboard-list">
        {query.data.map((item, index) => (
          <article
            className="leaderboard-row match-row"
            key={item.candidate.slug}
          >
            <span className="leaderboard-rank">{index + 1}</span>
            <div className="leaderboard-candidate">
              <Link to={`/u/${item.candidate.slug}`}>
                <strong>{item.candidate.fullName}</strong>
                <ArrowUpRight size={14} />
              </Link>
              <span>{item.candidate.headline || "Candidate"}</span>
            </div>
            <div className="leaderboard-score">
              <strong>{item.score}</strong>
              <span>% skill match</span>
            </div>
            <p className="match-why">{item.whyMatched}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
