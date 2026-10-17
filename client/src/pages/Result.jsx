import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { api, getApiError } from "../lib/api.js";
import { QRCodeSVG } from "qrcode.react";

async function loadResult(id) {
  try {
    return (await api.get(`/submissions/${id}/result`)).data.data;
  } catch (error) {
    if (
      error.response?.status !== 404 ||
      error.response?.data?.error?.code !== "RESULT_PENDING"
    )
      throw error;
    await api.post(`/submissions/${id}/finalize`);
    return (await api.get(`/submissions/${id}/result`)).data.data;
  }
}

export default function Result() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [guide, setGuide] = useState(null);
  const [guideBusy, setGuideBusy] = useState(false);
  const [guideError, setGuideError] = useState("");
  const result = useQuery({
    queryKey: ["result", id],
    queryFn: () => loadResult(id),
    retry: false,
  });
  if (result.isPending)
    return (
      <main className="result-page">
        <p className="eyebrow">A careful read of your work</p>
        <h1>Reviewing your answer.</h1>
        <div className="grading-steps" aria-live="polite">
          <span>Scoring against the approved rubric</span>
          <span>Checking evidence in your answer and explanations</span>
          <span>Comparing independent review runs</span>
        </div>
      </main>
    );
  if (result.isError)
    return (
      <main className="result-page">
        <p className="eyebrow">Your result</p>
        <h1>Review needs another try.</h1>
        <p role="alert">{getApiError(result.error)}</p>
        <button className="button button-dark" onClick={() => result.refetch()}>
          Retry scoring
        </button>
        <Link className="text-link" to={`/s/${id}/defend`}>
          Return to your defense
        </Link>
      </main>
    );
  const { score, challenge, badge } = result.data;
  const total = score.finalTotal ?? score.total;
  async function getGuide() {
    setGuideBusy(true);
    setGuideError("");
    try {
      setGuide((await api.post(`/skillgap/${id}`)).data.data);
    } catch (error) {
      setGuideError(getApiError(error));
    } finally {
      setGuideBusy(false);
    }
  }
  async function retryWithVariant() {
    setGuideBusy(true);
    setGuideError("");
    try {
      const { data } = await api.post(`/skillgap/${id}/retry`);
      navigate(data.data.url);
    } catch (error) {
      setGuideError(getApiError(error));
    } finally {
      setGuideBusy(false);
    }
  }
  return (
    <main className="result-page">
      <p className="eyebrow">
        {challenge.skill} · {challenge.level}
      </p>
      <h1>Your work, reviewed.</h1>
      <div className="result-summary">
        <div className="result-score">
          <strong>{Math.round(total)}</strong>
          <span>/ 100</span>
        </div>
        <div>
          <h2>{challenge.title}</h2>
          <p>{score.summary}</p>
        </div>
      </div>
      <div className="result-signals">
        <section>
          <p className="eyebrow">Explanation confidence</p>
          <strong className={`confidence confidence-${score.authenticity}`}>
            {score.authenticity} confidence
          </strong>
          <p>
            {score.authenticityReasons?.join(" ") ||
              "This signal summarizes how closely the explanation matched the submitted work."}
          </p>
        </section>
        <section>
          <p className="eyebrow">Review consistency</p>
          <strong>
            {score.needsHumanReview
              ? "Human review recommended"
              : "Consistent across reviews"}
          </strong>
          <p>
            Run variation: {Number(score.variance).toFixed(1)} points · Average
            grader confidence: {Math.round(score.graderConfidence * 100)}%
          </p>
        </section>
      </div>
      <section className="result-criteria">
        <h2>How the rubric was applied</h2>
        {score.criteria.map((criterion) => (
          <article key={criterion.id}>
            <div className="criterion-heading">
              <h3>{criterion.name}</h3>
              <strong>
                {Number(criterion.score).toFixed(1)} / {criterion.max}
              </strong>
            </div>
            <div className="criterion-bar">
              <span
                style={{
                  width: `${Math.min(100, (criterion.score / criterion.max) * 100)}%`,
                }}
              />
            </div>
            <p>{criterion.why}</p>
            <div className="evidence-list">
              {criterion.evidence.map((quote, index) => (
                <blockquote key={`${criterion.id}-${index}`}>
                  “{quote}”
                </blockquote>
              ))}
            </div>
          </article>
        ))}
      </section>
      {badge && (
        <section className="result-badge">
          <div>
            <p className="eyebrow">Your verified work badge</p>
            <h2>
              {badge.skill} · {badge.level}
            </h2>
            <p>
              {badge.verificationId} · {Math.round(badge.score)}/100 ·{" "}
              {badge.authenticity} confidence
            </p>
            <Link to={`/badge/${badge.verificationId}`} className="text-link">
              Open public verification page
            </Link>
          </div>
          <QRCodeSVG
            value={`${window.location.origin}/badge/${badge.verificationId}`}
            size={92}
            includeMargin
          />
        </section>
      )}
      <section className="skillgap-panel">
        <div>
          <p className="eyebrow">Keep building</p>
          <h2>Turn feedback into practice.</h2>
          <p>
            Get a short guide based on the criteria with the most room to grow.
          </p>
        </div>
        <button
          className="button button-outline"
          disabled={guideBusy}
          onClick={getGuide}
        >
          {guideBusy ? "Preparing…" : "Build my skill-gap guide"}
        </button>
        {guideError && (
          <p className="form-error" role="alert">
            {guideError}
          </p>
        )}
        {guide && (
          <div className="skillgap-guide">
            {guide.guide.weakCriteria.map((item) => (
              <article key={item.id}>
                <h3>{item.name}</h3>
                <p>{item.gap}</p>
                <strong>Try this:</strong>
                <p>{item.howToImprove}</p>
              </article>
            ))}
            <h3>A learning path</h3>
            <ol>
              {guide.guide.learningPath.map((item) => (
                <li key={item.title}>
                  <strong>{item.title}</strong> · {item.estHours} hr
                  <p>
                    {item.why} Resource: {item.resourceHint}
                  </p>
                </li>
              ))}
            </ol>
            <p>{guide.guide.retryAdvice}</p>
            {guide.retryAvailable && (
              <button
                className="button button-dark"
                disabled={guideBusy}
                onClick={retryWithVariant}
              >
                Retry with a new challenge variant
              </button>
            )}
          </div>
        )}
      </section>
      <div className="result-actions">
        <p>
          Every score is advisory. You can ask the hiring team for a human
          re-review.
        </p>
        <button
          className="button button-dark"
          onClick={async (event) => {
            event.currentTarget.disabled = true;
            try {
              await api.post("/rereview", {
                submissionId: id,
                reason: "Please review my result.",
              });
              event.currentTarget.textContent = "Review requested";
            } catch {
              event.currentTarget.disabled = false;
              event.currentTarget.textContent = "Request human review";
            }
          }}
        >
          Request human review
        </button>
      </div>
    </main>
  );
}
