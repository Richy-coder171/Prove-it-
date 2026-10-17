import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Clipboard,
  Clock3,
  QrCode,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { api, getApiError } from "../lib/api.js";

export default function ReviewChallenge() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(null);
  const challengeQuery = useQuery({
    queryKey: ["challenge", id],
    queryFn: async () =>
      (await api.get(`/challenges/${id}`)).data.data.challenge,
  });
  const challenge = draft ?? challengeQuery.data;
  const weightTotal = useMemo(
    () =>
      challenge?.rubric.criteria.reduce(
        (sum, item) => sum + Number(item.weight || 0),
        0,
      ) ?? 0,
    [challenge],
  );
  const validWeights = Math.round(weightTotal * 100) / 100 === 100;

  useEffect(() => {
    if (challengeQuery.data) setDraft(challengeQuery.data);
  }, [challengeQuery.data]);

  const update = useMutation({
    mutationFn: async (value) =>
      (await api.patch(`/challenges/${id}`, value)).data.data.challenge,
    onSuccess: (value) => {
      setDraft(value);
      queryClient.setQueryData(["challenge", id], value);
      return value;
    },
  });
  const approve = useMutation({
    mutationFn: async () =>
      (await api.post(`/challenges/${id}/approve`)).data.data.challenge,
    onSuccess: (value) => {
      setDraft(value);
      queryClient.setQueryData(["challenge", id], value);
      toast.success("Your challenge is approved and ready to share.");
    },
  });

  function edit(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function editCriterion(index, field, value) {
    setDraft((current) => ({
      ...current,
      rubric: {
        ...current.rubric,
        criteria: current.rubric.criteria.map((criterion, i) =>
          i === index ? { ...criterion, [field]: value } : criterion,
        ),
      },
    }));
  }

  async function handleApprove() {
    try {
      const saved = await update.mutateAsync(draft);
      await approve.mutateAsync(saved);
    } catch {
      // The mutation error below provides the user-facing message.
    }
  }

  const shareUrl = useMemo(
    () =>
      `${import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin}/c/${id}`,
    [id],
  );
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Candidate link copied.");
    } catch {
      toast.error("Could not copy the link. Select and copy it instead.");
    }
  }

  if (challengeQuery.isPending)
    return (
      <main className="workspace-page">
        <p role="status">Loading your challenge…</p>
      </main>
    );
  if (challengeQuery.isError)
    return (
      <main className="workspace-page">
        <p role="alert">{getApiError(challengeQuery.error)}</p>
        <Link to="/app" className="text-link">
          Back to workspace
        </Link>
      </main>
    );
  if (!challenge) return null;
  if (challenge.status !== "draft")
    return (
      <main className="workspace-page">
        <p className="eyebrow">Ready to share</p>
        <h1>{challenge.title}</h1>
        <p>This challenge has already been approved.</p>
        <ChallengeShare shareUrl={shareUrl} onCopy={copyLink} />
        <Link className="button button-dark review-leaderboard-link" to={`/startup/challenges/${id}/leaderboard`}>Open leaderboard</Link>
      </main>
    );

  return (
    <main className="workspace-page review-page">
      <Link className="text-link workspace-back" to="/app">
        <ArrowLeft size={15} /> Back to workspace
      </Link>
      <div className="review-heading">
        <div>
          <p className="eyebrow">Make it yours before it goes live</p>
          <h1>
            Review the
            <br />
            <em>challenge.</em>
          </h1>
        </div>
        <span className="draft-status">
          <i /> Draft for review
        </span>
      </div>
      <form
        className="review-form"
        onSubmit={(event) => {
          event.preventDefault();
          update.mutate(draft);
        }}
      >
        <section className="review-section">
          <h2>Set the context</h2>
          <div className="form-grid">
            <label>
              Challenge title
              <input
                value={challenge.title}
                onChange={(event) => edit("title", event.target.value)}
                maxLength={200}
              />
            </label>
            <label>
              Skill
              <input
                value={challenge.skill}
                onChange={(event) => edit("skill", event.target.value)}
                maxLength={100}
              />
            </label>
            <label>
              Experience
              <select
                value={challenge.level}
                onChange={(event) => edit("level", event.target.value)}
              >
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </label>
            <label>
              Time limit
              <select
                value={challenge.timeLimitMinutes}
                onChange={(event) =>
                  edit("timeLimitMinutes", Number(event.target.value))
                }
              >
                {[15, 20, 30, 45, 60].map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} minutes
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
        <section className="review-section">
          <h2>The work</h2>
          <label>
            Candidate task
            <textarea
              className="task-editor"
              value={challenge.taskMarkdown}
              onChange={(event) => edit("taskMarkdown", event.target.value)}
              maxLength={12_000}
            />
          </label>
          <p className="review-hint">
            <Clock3 size={14} /> One focused deliverable, written for the
            selected time limit.
          </p>
        </section>
        <section className="review-section">
          <div className="rubric-heading">
            <div>
              <h2>Scoring rubric</h2>
              <p>Adjust the weights to match what matters for this role.</p>
            </div>
            <span
              className={
                validWeights ? "weight-total is-valid" : "weight-total"
              }
            >
              {Number.isInteger(weightTotal)
                ? weightTotal
                : weightTotal.toFixed(1)}{" "}
              / 100 {validWeights && <Check size={14} />}
            </span>
          </div>
          <div className="rubric-list">
            {challenge.rubric.criteria.map((criterion, index) => (
              <article className="rubric-item" key={criterion.id}>
                <div>
                  <h3>{criterion.name}</h3>
                  <p>{criterion.description}</p>
                </div>
                <label>
                  <span>Weight</span>
                  <div className="weight-input">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      value={criterion.weight}
                      onChange={(event) =>
                        editCriterion(
                          index,
                          "weight",
                          Number(event.target.value),
                        )
                      }
                    />
                    <span>%</span>
                  </div>
                </label>
              </article>
            ))}
          </div>
          {!validWeights && (
            <p className="weight-error" role="alert">
              Weights must add up to 100 before approval.
            </p>
          )}
        </section>
        {(update.isError || approve.isError) && (
          <p className="form-error" role="alert">
            {getApiError(update.error ?? approve.error)}
          </p>
        )}
        <div className="review-actions">
          <p>Nothing goes live until you approve it.</p>
          <div>
            <button
              className="button button-soft"
              type="submit"
              disabled={update.isPending || approve.isPending}
            >
              Save edits
            </button>
            <button
              className="button button-dark"
              type="button"
              onClick={handleApprove}
              disabled={!validWeights || update.isPending || approve.isPending}
            >
              {approve.isPending ? "Approving…" : "Approve challenge"}{" "}
              <ArrowUpRight size={17} />
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}

function ChallengeShare({ shareUrl, onCopy }) {
  return (
    <section className="challenge-share">
      <div>
        <p className="eyebrow">Your challenge is ready</p>
        <h2>Pass the link along.</h2>
        <p>
          Candidates can see the challenge and begin when you’re ready to share
          it.
        </p>
        <div className="share-link">
          <input aria-label="Candidate link" readOnly value={shareUrl} />
          <button className="button button-dark" onClick={onCopy}>
            <Clipboard size={15} /> Copy link
          </button>
        </div>
      </div>
      <div className="share-qr">
        <QRCodeSVG value={shareUrl} size={126} level="M" includeMargin />
        <span>
          <QrCode size={13} /> Scan to open
        </span>
      </div>
    </section>
  );
}
