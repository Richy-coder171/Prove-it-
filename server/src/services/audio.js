import mongoose from "mongoose";
import { GridFSBucket, ObjectId } from "mongodb";
import OpenAI, { toFile } from "openai";
import { env } from "../config/env.js";

let openai;
function bucket() {
  if (!mongoose.connection.db)
    throw Object.assign(new Error("Audio storage is not connected"), {
      status: 503,
      code: "AUDIO_UNAVAILABLE",
    });
  return new GridFSBucket(mongoose.connection.db, {
    bucketName: "answerAudio",
  });
}

export async function storeAndTranscribe({
  buffer,
  mimetype,
  submission,
  qid,
  owner,
}) {
  if (!env.OPENAI_API_KEY)
    throw Object.assign(
      new Error(
        "Voice transcription is unavailable. Please use the text answer option.",
      ),
      { status: 503, code: "TRANSCRIPTION_UNAVAILABLE" },
    );
  openai ??= new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    timeout: 30_000,
    maxRetries: 0,
  });
  const fileId = new ObjectId();
  const upload = bucket().openUploadStreamWithId(fileId, `answer-${qid}`, {
    contentType: mimetype,
    metadata: { submission: String(submission), qid, owner: String(owner) },
  });
  await new Promise((resolve, reject) => {
    upload.once("error", reject);
    upload.once("finish", resolve);
    upload.end(buffer);
  });
  try {
    const file = await toFile(
      buffer,
      `answer-${qid}.${mimetype.includes("webm") ? "webm" : "mp4"}`,
      { type: mimetype },
    );
    const result = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
    });
    if (!result.text?.trim())
      throw new Error(
        "No speech was detected. Please try again or type your answer.",
      );
    return { fileId, transcript: result.text.trim() };
  } catch (error) {
    await bucket()
      .delete(fileId)
      .catch(() => {});
    throw error;
  }
}

export function openAuthorizedAudio(fileId) {
  return bucket().openDownloadStream(new ObjectId(fileId));
}

export function deleteAudio(fileId) {
  return bucket().delete(new ObjectId(fileId));
}
