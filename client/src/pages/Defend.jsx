import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, getApiError } from '../lib/api.js';

function useSpeechInput() {
  const [supported, setSupported] = useState(false);
  useEffect(() => { setSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)); }, []);
  return supported;
}

export default function Defend() {
  const { id } = useParams();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [listening, setListening] = useState('');
  const [recording, setRecording] = useState('');
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const speechAvailable = useSpeechInput();
  const attempt = useQuery({ queryKey: ['submission', id], queryFn: async () => (await api.get(`/submissions/${id}`)).data.data.submission, retry: false });

  useEffect(() => {
    if (!attempt.data || !['submitted', 'defending'].includes(attempt.data.status)) return;
    api.post(`/submissions/${id}/followups`).then(({ data }) => {
      setQuestions(data.data.questions);
      setAnswers(Object.fromEntries(data.data.questions.map(({ id: qid }) => [qid, ''])));
    }).catch((reason) => setError(getApiError(reason)));
  }, [id, attempt.data]);

  async function submit(qid) {
    const text = answers[qid]?.trim();
    if (!text) return;
    setBusy(true); setError('');
    try {
      const { data } = await api.post(`/submissions/${id}/followups/${qid}/answer`, { text });
      markAnswered(qid, data.data.transcript);
    } catch (reason) { setError(getApiError(reason)); }
    finally { setBusy(false); }
  }

  function markAnswered(qid, transcript) {
    setAnswers((items) => ({ ...items, [qid]: transcript }));
    setQuestions((items) => items.map((item) => item.id === qid ? { ...item, answered: true } : item));
  }

  async function toggleRecording(qid) {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
      setRecording('');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('Audio recording is not supported here. Type your answer or use speak input.');
      return;
    }
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder; chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size > 5 * 1024 * 1024) { setError('That recording is over 5 MB. Please record a shorter answer or type it.'); return; }
        const form = new FormData(); form.append('audio', blob, 'answer.webm');
        setBusy(true);
        try {
          const { data } = await api.post(`/submissions/${id}/followups/${qid}/answer`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
          markAnswered(qid, data.data.transcript);
        } catch (reason) { setError(getApiError(reason)); }
        finally { setBusy(false); }
      };
      recorder.start(); setRecording(qid);
    } catch { setError('Microphone access was unavailable. You can type your answer instead.'); }
  }

  useEffect(() => () => { if (recorderRef.current?.state === 'recording') recorderRef.current.stop(); }, []);

  function dictate(qid) {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = navigator.language || 'en-US'; recognition.interimResults = false;
    setListening(qid);
    recognition.onresult = (event) => setAnswers((items) => ({ ...items, [qid]: `${items[qid] ? `${items[qid]} ` : ''}${event.results[0][0].transcript}` }));
    recognition.onerror = () => setError('Speech input stopped. You can continue by typing your answer.');
    recognition.onend = () => setListening('');
    recognition.start();
  }

  if (attempt.isPending) return <main className="defend-page"><p role="status">Opening your defense…</p></main>;
  if (attempt.isError) return <main className="defend-page"><p role="alert">{getApiError(attempt.error)}</p></main>;
  const complete = questions.length === 3 && questions.every(({ answered }) => answered);
  return <main className="defend-page">
    <p className="eyebrow">Your work, in your words</p>
    <h1>Talk through your choices.</h1>
    <p className="defend-intro">Three short questions about the answer you submitted. Your words are transcribed and assessed as text; voice characteristics are not scored.</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    {questions.length === 0 && !error && <p role="status">Preparing questions from your submission…</p>}
    <section className="defend-questions">{questions.map((item, index) => <article key={item.id} className="defend-question">
      <div><p className="eyebrow">Question {index + 1} · {item.difficulty}</p><h2>{item.question}</h2><p className="defend-target">Explain: {item.targets.join(' · ')}</p></div>
      {item.answered ? <p className="defend-saved">Answer recorded</p> : <>
        <textarea className="answer-editor defend-editor" aria-label={`Answer to question ${index + 1}`} value={answers[item.id] ?? ''} maxLength={10_000} onChange={(event) => setAnswers((values) => ({ ...values, [item.id]: event.target.value }))} placeholder="Describe what you considered and why…" />
        <div className="defend-actions">{speechAvailable && <button type="button" className="button button-outline" disabled={busy} onClick={() => dictate(item.id)}>{listening === item.id ? 'Listening…' : 'Dictate to text'}</button>}{navigator.mediaDevices?.getUserMedia && window.MediaRecorder && <button type="button" className="button button-outline" disabled={busy} onClick={() => toggleRecording(item.id)}>{recording === item.id ? 'Stop recording' : 'Record audio'}</button>}<button type="button" className="button button-dark" disabled={busy || !answers[item.id]?.trim()} onClick={() => submit(item.id)}>{busy ? 'Saving…' : 'Save answer'}</button></div>
      </>}
    </article>)}</section>
    {complete && <div className="defend-complete"><h2>Defense complete.</h2><p>Your answer and explanations are ready for review.</p><Link className="button button-dark" to={`/s/${id}/result`}>View result</Link></div>}
  </main>;
}
