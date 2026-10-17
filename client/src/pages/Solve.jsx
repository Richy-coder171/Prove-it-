import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Editor from "@monaco-editor/react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Clock3, LoaderCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { api, getApiError } from "../lib/api.js";
import { useCountdown } from "../hooks/useCountdown.js";

export default function Solve() {
  const { id } = useParams();
  const [answer, setAnswer] = useState("");
  const [saveStatus, setSaveStatus] = useState("saved");
  const [submitError, setSubmitError] = useState("");
  const answerRef = useRef("");
  const savedRef = useRef("");
  const submittingRef = useRef(false);
  const savingRef = useRef(null);
  const submissionQuery = useQuery({
    queryKey: ["submission", id],
    queryFn: async () => (await api.get(`/submissions/${id}`)).data.data,
    retry: false,
  });
  const submission = submissionQuery.data?.submission;
  const challenge = submission?.challenge;
  const savedAnswer = submission?.answerText ?? "";
  const countdown = useCountdown(
    submission?.deadlineAt ?? new Date().toISOString(),
    submissionQuery.data?.serverNow ?? new Date().toISOString(),
  );
  const isEditable = submission?.status === "in_progress";

  useEffect(() => {
    if (!submission?.id) return;
    setAnswer(savedAnswer);
    answerRef.current = savedAnswer;
    savedRef.current = savedAnswer;
  }, [submission?.id, savedAnswer]);

  const saveAnswer = useCallback(
    async (quiet = false) => {
      if (!isEditable) return false;
      if (answerRef.current === savedRef.current) return true;
      if (savingRef.current) {
        const saved = await savingRef.current;
        if (!saved) return false;
        return answerRef.current === savedRef.current
          ? true
          : saveAnswer(quiet);
      }
      const value = answerRef.current;
      setSaveStatus("saving");
      savingRef.current = (async () => {
        try {
          await api.patch(`/submissions/${id}/autosave`, { answerText: value });
          savedRef.current = value;
          setSaveStatus(answerRef.current === value ? "saved" : "unsaved");
          return true;
        } catch (error) {
          setSaveStatus("error");
          if (!quiet) toast.error(getApiError(error));
          return false;
        }
      })();
      const result = await savingRef.current;
      savingRef.current = null;
      if (result && answerRef.current !== savedRef.current)
        return saveAnswer(quiet);
      return result;
    },
    [id, isEditable],
  );

  const submitAnswer = useCallback(
    async (automatic = false) => {
      if (!isEditable || submittingRef.current) return;
      if (
        !automatic &&
        !window.confirm(
          "Submit this answer? You will not be able to edit it afterward.",
        )
      )
        return;
      submittingRef.current = true;
      setSubmitError("");
      if (!(await saveAnswer(true))) {
        submittingRef.current = false;
        setSubmitError(
          "Your latest edits could not be saved. Check your connection and try again.",
        );
        return;
      }
      try {
        await api.post(`/submissions/${id}/submit`);
        await submissionQuery.refetch();
        toast.success(
          "Answer submitted. Your next step is to explain your approach.",
        );
      } catch (error) {
        submittingRef.current = false;
        setSubmitError(getApiError(error));
      }
    },
    [id, isEditable, saveAnswer, submissionQuery],
  );

  const submitRef = useRef(submitAnswer);
  submitRef.current = submitAnswer;

  useEffect(() => {
    if (!isEditable) return undefined;
    const interval = window.setInterval(() => {
      void saveAnswer(true);
    }, 10_000);
    return () => window.clearInterval(interval);
  }, [isEditable, saveAnswer]);

  useEffect(() => {
    if (!isEditable) return undefined;
    const trackBlur = () => {
      void api
        .post(`/submissions/${id}/integrity`, { type: "blur" })
        .catch(() => {});
    };
    window.addEventListener("blur", trackBlur);
    return () => window.removeEventListener("blur", trackBlur);
  }, [id, isEditable]);

  useEffect(() => {
    if (isEditable && countdown === 0) void submitRef.current(true);
  }, [countdown, isEditable]);

  function updateAnswer(value) {
    answerRef.current = value;
    setAnswer(value);
    if (isEditable) setSaveStatus("unsaved");
  }

  function trackPaste(event) {
    const length = event.clipboardData.getData("text").length;
    void api
      .post(`/submissions/${id}/integrity`, { type: "paste", length })
      .catch(() => {});
  }

  if (submissionQuery.isPending)
    return (
      <main className="solve-page">
        <p role="status">Loading your workspace…</p>
      </main>
    );
  if (submissionQuery.isError)
    return (
      <main className="solve-page">
        <p className="eyebrow">We couldn’t open this attempt</p>
        <p role="alert">{getApiError(submissionQuery.error)}</p>
        <Link className="text-link" to="/">
          Back to ProveIt
        </Link>
      </main>
    );
  if (!submission || !challenge) return null;

  const minutes = Math.floor(countdown / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (countdown % 60).toString().padStart(2, "0");
  const timerTone =
    countdown < 60 ? "is-urgent" : countdown < 300 ? "is-warning" : "";

  return (
    <main className="solve-page">
      <div className="solve-top">
        <Link to={`/c/${challenge.id}`} className="text-link">
          <ArrowLeft size={14} /> Challenge details
        </Link>
        <div className={`countdown ${timerTone}`} aria-live="off">
          <Clock3 size={16} />
          <span>
            {isEditable
              ? `${minutes}:${seconds}`
              : submission.status === "submitted"
                ? "Submitted"
                : submission.status.replace("_", " ")}
          </span>
        </div>
      </div>
      <div className="solve-layout">
        <aside className="task-pane">
          <p className="eyebrow">
            {challenge.skill} · {challenge.level}
          </p>
          <h1>{challenge.title}</h1>
          <div className="task-copy">{challenge.taskMarkdown}</div>
          <p className="task-note">
            We don’t penalize tab switches. This context is not used in scoring.
          </p>
        </aside>
        <section className="answer-pane">
          <div className="answer-heading">
            <div>
              <p className="eyebrow">Your response</p>
              <h2>Show your thinking.</h2>
            </div>
            <span className={`save-indicator ${saveStatus}`} aria-live="polite">
              {saveStatus === "saving" ? (
                <>
                  <LoaderCircle /> Saving
                </>
              ) : saveStatus === "error" ? (
                "Not saved"
              ) : saveStatus === "unsaved" ? (
                "Unsaved changes"
              ) : (
                <>
                  <Check /> Saved
                </>
              )}
            </span>
          </div>
          {challenge.taskType === "code" ? (
            <div
              className="monaco-wrap"
              aria-label="Your code answer"
              onPaste={trackPaste}
            >
              <Editor
                height="430px"
                defaultLanguage="javascript"
                theme="light"
                value={answer}
                onChange={(value) => updateAnswer(value ?? "")}
                options={{
                  ariaLabel: "Your code answer",
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  wordWrap: "on",
                  padding: { top: 16 },
                  readOnly: !isEditable,
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          ) : (
            <textarea
              className="answer-editor"
              value={answer}
              maxLength={20_000}
              onChange={(event) => updateAnswer(event.target.value)}
              onPaste={trackPaste}
              disabled={!isEditable}
              aria-label="Your answer"
              placeholder="Write your response here. Include the choices you made and why."
            />
          )}
          <div className="answer-footer">
            <span>{answer.length.toLocaleString()} / 20,000 characters</span>
            <button
              className="button button-dark"
              disabled={!isEditable || submittingRef.current}
              onClick={() => submitAnswer(false)}
            >
              Submit answer <Send size={15} />
            </button>
          </div>
          {submitError && (
            <p className="form-error" role="alert">
              {submitError}
            </p>
          )}
          {!isEditable && (
            <div className="submitted-next">
              <Check size={17} />
              <div>
                <strong>Your answer is submitted.</strong>
                <span>
                  The next step is to explain the choices behind your work.
                </span>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
