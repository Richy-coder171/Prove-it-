import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { api, getApiError } from "../lib/api.js";

export default function NewChallenge() {
  const [mode, setMode] = useState("hiring");
  const [sourceText, setSourceText] = useState("");
  const navigate = useNavigate();
  const generate = useMutation({
    mutationFn: async (input) =>
      (await api.post("/challenges/generate", input)).data.data.challenge,
    onSuccess: (challenge) =>
      navigate(`/startup/challenges/${challenge.id}/review`),
  });

  return (
    <main className="workspace-page">
      <a className="text-link workspace-back" href="/app">
        <ArrowLeft size={15} /> Back to workspace
      </a>
      <div className="workspace-heading">
        <p className="eyebrow">Build a useful first conversation</p>
        <h1>
          Start with
          <br />
          <em>real work.</em>
        </h1>
        <p>
          Share a role or an idea. ProveIt will shape it into a small, practical
          challenge for you to review.
        </p>
      </div>
      <form
        className="challenge-form"
        onSubmit={(event) => {
          event.preventDefault();
          generate.mutate({ mode, sourceText: sourceText.trim() });
        }}
      >
        <fieldset className="mode-switch">
          <legend>What are you building?</legend>
          <div>
            <button
              type="button"
              className={mode === "hiring" ? "is-selected" : ""}
              aria-pressed={mode === "hiring"}
              onClick={() => setMode("hiring")}
            >
              <FileText size={17} />
              <span>
                <strong>I’m hiring</strong>
                <small>Turn a role into a work sample</small>
              </span>
            </button>
            <button
              type="button"
              className={mode === "founder" ? "is-selected" : ""}
              aria-pressed={mode === "founder"}
              onClick={() => setMode("founder")}
            >
              <Lightbulb size={17} />
              <span>
                <strong>I have an idea</strong>
                <small>Find people to build alongside</small>
              </span>
            </button>
          </div>
        </fieldset>
        <label className="source-label">
          {mode === "hiring"
            ? "Paste the job description"
            : "Tell us about the idea"}
          <span>
            Include the skills, context, and decisions that matter most.
          </span>
          <textarea
            required
            minLength={30}
            maxLength={20_000}
            value={sourceText}
            onChange={(event) => setSourceText(event.target.value)}
            placeholder={
              mode === "hiring"
                ? "What will this person work on? What does good work look like?"
                : "What are you trying to build? Who is it for, and what will be hard about it?"
            }
          />
        </label>
        <div className="source-foot">
          <span>{sourceText.length.toLocaleString()} / 20,000 characters</span>
          <span>A human reviews every challenge before it goes live.</span>
        </div>
        {generate.isError && (
          <p className="form-error" role="alert">
            {getApiError(generate.error)}
          </p>
        )}
        <div className="generate-actions">
          <p>
            <Sparkles size={15} /> You’ll be able to edit the challenge and
            rubric before approval.
          </p>
          <button
            className="button button-dark"
            disabled={generate.isPending || sourceText.trim().length < 30}
          >
            {generate.isPending
              ? "Building your challenge…"
              : "Generate a draft"}{" "}
            <ArrowRight size={17} />
          </button>
        </div>
      </form>
    </main>
  );
}
