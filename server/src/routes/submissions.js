import { Router } from "express";
import { z } from "zod";
import Challenge from "../models/Challenge.js";
import Submission from "../models/Submission.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { aiLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import multer from "multer";
import { generateFollowups } from "../services/ai/followups.js";
import {
  deleteAudio,
  openAuthorizedAudio,
  storeAndTranscribe,
} from "../services/audio.js";
import Score from "../models/Score.js";
import { gradeSubmission } from "../services/ai/grader.js";
import Badge from "../models/Badge.js";

export function createSubmissionRouter({
  SubmissionModel = Submission,
  ChallengeModel = Challenge,
  followupGenerator = generateFollowups,
  audioStore = storeAndTranscribe,
  audioOpen = openAuthorizedAudio,
  audioDelete = deleteAudio,
  ScoreModel = Score,
  BadgeModel = Badge,
  grade = gradeSubmission,
} = {}) {
  const router = Router();
  const idSchema = z
    .object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid submission ID") })
    .strict();
  const questionParamsSchema = z
    .object({
      id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid submission ID"),
      qid: z.enum(["q1", "q2", "q3"]),
    })
    .strict();
  const startSchema = z
    .object({
      challengeId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid challenge ID"),
    })
    .strict();
  const answerSchema = z
    .object({ answerText: z.string().max(20_000) })
    .strict();
  const integritySchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("blur") }).strict(),
    z
      .object({
        type: z.literal("paste"),
        length: z.number().int().min(0).max(20_000),
      })
      .strict(),
  ]);
  const answerTextSchema = z
    .object({ text: z.string().trim().min(1).max(10_000) })
    .strict();
  const audioUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, done) =>
      done(null, /^audio\/(webm|mp4|mpeg|wav|ogg)$/.test(file.mimetype)),
  });

  async function owned(req) {
    return SubmissionModel.findOne({
      _id: req.params.id,
      candidate: req.user.id,
    });
  }

  router.post(
    "/:id/followups",
    auth,
    requireRole("candidate"),
    aiLimiter,
    validate(idSchema, "params"),
    asyncHandler(async (req, res) => {
      const submission = await owned(req);
      if (!submission)
        return res.status(404).json({
          ok: false,
          error: { message: "Submission not found", code: "NOT_FOUND" },
        });
      if (!["submitted", "defending"].includes(submission.status))
        return res.status(409).json({
          ok: false,
          error: {
            message: "Submit your answer before starting the defense",
            code: "ANSWER_NOT_SUBMITTED",
          },
        });
      if (!submission.followups?.length) {
        const challenge = await ChallengeModel.findById(submission.challenge);
        const result = await followupGenerator({
          answerText: submission.answerText,
          challenge,
          seeds: challenge.followupSeeds,
        });
        submission.followups = result.questions.map(
          ({ id: qid, ...question }) => ({ qid, ...question }),
        );
        submission.status = "defending";
        await submission.save();
      }
      return res.json({
        ok: true,
        data: {
          questions: submission.followups.map(
            ({
              qid,
              question,
              targets,
              difficulty,
              answerTranscript,
              answeredBy,
              audioFileId,
            }) => ({
              id: qid,
              question,
              targets,
              difficulty,
              answered: Boolean(answerTranscript),
              transcript: answerTranscript,
              answeredBy,
              audioRecorded: Boolean(audioFileId),
            }),
          ),
        },
      });
    }),
  );

  router.delete(
    "/:id/audio/:qid",
    auth,
    requireRole("candidate"),
    validate(questionParamsSchema, "params"),
    asyncHandler(async (req, res) => {
      const submission = await owned(req);
      const followup = submission?.followups.find(
        ({ qid }) => qid === req.params.qid,
      );
      if (!followup?.audioFileId)
        return res.status(404).json({
          ok: false,
          error: { message: "Audio not found", code: "NOT_FOUND" },
        });
      await audioDelete(followup.audioFileId);
      followup.audioFileId = undefined;
      await submission.save();
      return res.json({
        ok: true,
        data: {
          audioDeleted: true,
          transcriptRetained: Boolean(followup.answerTranscript),
        },
      });
    }),
  );

  router.post(
    "/:id/followups/:qid/answer",
    auth,
    requireRole("candidate"),
    aiLimiter,
    validate(questionParamsSchema, "params"),
    (req, res, next) => {
      if (req.is("multipart/form-data"))
        return audioUpload.single("audio")(req, res, next);
      return next();
    },
    asyncHandler(async (req, res) => {
      const submission = await owned(req);
      if (!submission)
        return res.status(404).json({
          ok: false,
          error: { message: "Submission not found", code: "NOT_FOUND" },
        });
      if (submission.status !== "defending")
        return res.status(409).json({
          ok: false,
          error: {
            message: "The defense is not active",
            code: "DEFENSE_NOT_ACTIVE",
          },
        });
      const followup = submission.followups.find(
        ({ qid }) => qid === req.params.qid,
      );
      if (!followup)
        return res.status(404).json({
          ok: false,
          error: {
            message: "Question not found",
            code: "QUESTION_NOT_FOUND",
          },
        });
      if (followup.answeredAt)
        return res.status(409).json({
          ok: false,
          error: {
            message: "This question is already answered",
            code: "ANSWER_LOCKED",
          },
        });
      let transcript;
      let audioFileId;
      let answeredBy = "text";
      if (req.file) {
        const stored = await audioStore({
          buffer: req.file.buffer,
          mimetype: req.file.mimetype,
          submission: submission.id,
          qid: followup.qid,
          owner: req.user.id,
        });
        transcript = stored.transcript;
        audioFileId = stored.fileId;
        answeredBy = "voice";
      } else {
        const parsed = answerTextSchema.safeParse(req.body);
        if (!parsed.success)
          return res.status(400).json({
            ok: false,
            error: {
              message: "Provide a text answer or audio recording",
              code: "INVALID_ANSWER",
            },
          });
        transcript = parsed.data.text;
      }
      followup.answerTranscript = transcript;
      followup.audioFileId = audioFileId;
      followup.answeredAt = new Date();
      followup.answeredBy = answeredBy;
      await submission.save();
      return res.json({
        ok: true,
        data: { id: followup.qid, answered: true, transcript, answeredBy },
      });
    }),
  );

  router.patch(
    "/:id/followups/:qid/answer",
    auth,
    requireRole("candidate"),
    validate(questionParamsSchema, "params"),
    validate(answerTextSchema),
    asyncHandler(async (req, res) => {
      const submission = await owned(req);
      if (!submission || submission.status !== "defending")
        return res.status(404).json({
          ok: false,
          error: { message: "Defense not found", code: "NOT_FOUND" },
        });
      const followup = submission.followups.find(
        ({ qid }) => qid === req.params.qid,
      );
      if (!followup?.answeredAt)
        return res.status(404).json({
          ok: false,
          error: { message: "Recorded answer not found", code: "NOT_FOUND" },
        });
      followup.answerTranscript = req.body.text;
      await submission.save();
      return res.json({
        ok: true,
        data: { transcript: followup.answerTranscript },
      });
    }),
  );

  router.post(
    "/:id/finalize",
    auth,
    requireRole("candidate"),
    aiLimiter,
    validate(idSchema, "params"),
    asyncHandler(async (req, res) => {
      const submission = await owned(req);
      if (!submission)
        return res.status(404).json({
          ok: false,
          error: { message: "Submission not found", code: "NOT_FOUND" },
        });
      if (submission.status === "graded") {
        const score = await ScoreModel.findOne({ submission: submission.id });
        return res.json({ ok: true, data: { score } });
      }
      if (!["defending", "error"].includes(submission.status))
        return res.status(409).json({
          ok: false,
          error: {
            message: "Complete your answer defense before scoring",
            code: "DEFENSE_INCOMPLETE",
          },
        });
      if (
        submission.followups.length !== 3 ||
        submission.followups.some(({ answeredAt }) => !answeredAt)
      )
        return res.status(409).json({
          ok: false,
          error: {
            message: "Answer all three defense questions before scoring",
            code: "DEFENSE_INCOMPLETE",
          },
        });
      submission.status = "grading";
      await submission.save();
      try {
        const { score } = await grade({ submissionId: submission.id });
        submission.status = "graded";
        await submission.save();
        return res.json({ ok: true, data: { score } });
      } catch (error) {
        submission.status = "error";
        await submission.save();
        throw error;
      }
    }),
  );

  router.get(
    "/:id/result",
    auth,
    requireRole("candidate", "startup"),
    validate(idSchema, "params"),
    asyncHandler(async (req, res) => {
      const submission = await SubmissionModel.findById(req.params.id).populate(
        "challenge",
        "owner title skill level",
      );
      if (
        !submission ||
        (req.user.role === "candidate" &&
          String(submission.candidate) !== req.user.id) ||
        (req.user.role === "startup" &&
          String(submission.challenge.owner) !== req.user.id)
      )
        return res.status(404).json({
          ok: false,
          error: { message: "Result not found", code: "NOT_FOUND" },
        });
      const score = await ScoreModel.findOne({
        submission: submission.id,
      }).select("-runs");
      if (!score)
        return res.status(404).json({
          ok: false,
          error: {
            message: "No result is available yet",
            code: "RESULT_PENDING",
          },
        });
      const badge = await BadgeModel.findOne({
        submission: submission.id,
        candidate: submission.candidate,
      }).select(
        "verificationId skill level score authenticity issuedAt isPublic",
      );
      return res.json({
        ok: true,
        data: {
          score,
          badge,
          challenge: submission.challenge,
          status: submission.status,
        },
      });
    }),
  );

  router.get(
    "/:id/review",
    auth,
    requireRole("startup"),
    validate(idSchema, "params"),
    asyncHandler(async (req, res) => {
      const submission = await SubmissionModel.findById(req.params.id)
        .populate("challenge", "owner title skill level mode")
        .populate("candidate", "fullName slug headline skills");
      if (!submission || String(submission.challenge.owner) !== req.user.id)
        return res.status(404).json({
          ok: false,
          error: { message: "Candidate result not found", code: "NOT_FOUND" },
        });
      const score = await ScoreModel.findOne({ submission: submission.id });
      if (!score)
        return res.status(404).json({
          ok: false,
          error: { message: "Score not found", code: "NOT_FOUND" },
        });
      return res.json({
        ok: true,
        data: {
          submission: {
            id: submission.id,
            candidate: submission.candidate,
            attempt: submission.attempt,
            answerText: submission.answerText,
            followups: submission.followups.map(
              ({ qid, question, answerTranscript }) => ({
                qid,
                question,
                answerTranscript,
              }),
            ),
          },
          challenge: submission.challenge,
          score: score.toObject
            ? {
                ...score.toObject(),
                runs: score.runs.map(({ total }) => ({ total })),
              }
            : score,
        },
      });
    }),
  );

  router.get(
    "/:id/audio/:qid",
    auth,
    requireRole("candidate", "startup"),
    validate(questionParamsSchema, "params"),
    asyncHandler(async (req, res) => {
      const submission =
        req.user.role === "candidate"
          ? await owned(req)
          : await SubmissionModel.findById(req.params.id).populate(
              "challenge",
              "owner",
            );
      if (
        req.user.role === "startup" &&
        (!submission || String(submission.challenge.owner) !== req.user.id)
      )
        return res.status(404).json({
          ok: false,
          error: { message: "Audio not found", code: "NOT_FOUND" },
        });
      const followup = submission?.followups.find(
        ({ qid }) => qid === req.params.qid,
      );
      if (!followup?.audioFileId)
        return res.status(404).json({
          ok: false,
          error: { message: "Audio not found", code: "NOT_FOUND" },
        });
      res.type("application/octet-stream");
      const stream = audioOpen(followup.audioFileId);
      stream.on("error", (error) => {
        if (!res.headersSent) res.status(404).end();
        else res.destroy(error);
      });
      stream.pipe(res);
    }),
  );

  router.post(
    "/start",
    auth,
    requireRole("candidate"),
    validate(startSchema),
    asyncHandler(async (req, res) => {
      const challenge = await ChallengeModel.findById(req.body.challengeId);
      if (!challenge || challenge.status !== "approved") {
        return res.status(404).json({
          ok: false,
          error: {
            message: "This challenge is not available",
            code: "CHALLENGE_UNAVAILABLE",
          },
        });
      }
      const rootChallengeId = challenge.variantOf ?? challenge.id;
      const family = await ChallengeModel.find({
        $or: [{ _id: rootChallengeId }, { variantOf: rootChallengeId }],
      }).select("_id");
      const challengeIds = family.map(({ _id }) => _id);
      const attempts = await SubmissionModel.countDocuments({
        challenge: { $in: challengeIds },
        candidate: req.user.id,
      });
      if (attempts >= 3)
        return res.status(409).json({
          ok: false,
          error: {
            message: "You have reached the attempt limit for this challenge",
            code: "ATTEMPT_LIMIT",
          },
        });

      const startedAt = new Date();
      const deadlineAt = new Date(
        startedAt.getTime() + challenge.timeLimitMinutes * 60_000,
      );
      let submission;
      try {
        submission = await SubmissionModel.create({
          challenge: challenge.id,
          candidate: req.user.id,
          attempt: attempts + 1,
          status: "in_progress",
          startedAt,
          deadlineAt,
        });
      } catch (error) {
        if (error.code === 11000)
          return res.status(409).json({
            ok: false,
            error: {
              message: "An attempt for this challenge is already in progress",
              code: "ATTEMPT_EXISTS",
            },
          });
        throw error;
      }
      return res.status(201).json({
        ok: true,
        data: { submission, serverNow: new Date().toISOString() },
      });
    }),
  );

  router.patch(
    "/:id/autosave",
    auth,
    requireRole("candidate"),
    validate(idSchema, "params"),
    validate(answerSchema),
    asyncHandler(async (req, res) => {
      const submission = await SubmissionModel.findOneAndUpdate(
        {
          _id: req.params.id,
          candidate: req.user.id,
          status: "in_progress",
          deadlineAt: { $gte: new Date(Date.now() - 15_000) },
        },
        { $set: { answerText: req.body.answerText } },
        { new: true, runValidators: true },
      );
      if (!submission)
        return res.status(409).json({
          ok: false,
          error: {
            message: "This answer is no longer editable",
            code: "SUBMISSION_LOCKED",
          },
        });
      return res.json({
        ok: true,
        data: { savedAt: new Date().toISOString() },
      });
    }),
  );

  router.post(
    "/:id/submit",
    auth,
    requireRole("candidate"),
    validate(idSchema, "params"),
    asyncHandler(async (req, res) => {
      const submission = await SubmissionModel.findOne({
        _id: req.params.id,
        candidate: req.user.id,
      });
      if (!submission)
        return res.status(404).json({
          ok: false,
          error: { message: "Submission not found", code: "NOT_FOUND" },
        });
      if (submission.status !== "in_progress" || submission.submittedAt) {
        return res.status(409).json({
          ok: false,
          error: {
            message: "This answer has already been submitted",
            code: "SUBMISSION_LOCKED",
          },
        });
      }
      if (Date.now() > new Date(submission.deadlineAt).getTime() + 15_000) {
        return res.status(410).json({
          ok: false,
          error: {
            message: "The challenge deadline has passed",
            code: "DEADLINE_PASSED",
          },
        });
      }
      submission.status = "submitted";
      submission.submittedAt = new Date();
      await submission.save();
      return res.json({
        ok: true,
        data: { submission, serverNow: new Date().toISOString() },
      });
    }),
  );

  router.post(
    "/:id/integrity",
    auth,
    requireRole("candidate"),
    validate(idSchema, "params"),
    validate(integritySchema),
    asyncHandler(async (req, res) => {
      const update =
        req.body.type === "blur"
          ? { $inc: { "integrity.tabBlurCount": 1 } }
          : {
              $push: {
                "integrity.pasteEvents": {
                  at: new Date(),
                  length: req.body.length,
                },
              },
            };
      const submission = await SubmissionModel.findOneAndUpdate(
        { _id: req.params.id, candidate: req.user.id, status: "in_progress" },
        update,
        { new: true },
      );
      if (!submission)
        return res.status(409).json({
          ok: false,
          error: {
            message: "This answer is no longer editable",
            code: "SUBMISSION_LOCKED",
          },
        });
      return res.json({ ok: true, data: { recorded: true } });
    }),
  );

  router.get(
    "/:id",
    auth,
    requireRole("candidate"),
    validate(idSchema, "params"),
    asyncHandler(async (req, res) => {
      const submission = await SubmissionModel.findOne({
        _id: req.params.id,
        candidate: req.user.id,
      }).populate(
        "challenge",
        "title mode skill level taskType taskMarkdown timeLimitMinutes status",
      );
      if (!submission)
        return res.status(404).json({
          ok: false,
          error: { message: "Submission not found", code: "NOT_FOUND" },
        });
      return res.json({
        ok: true,
        data: { submission, serverNow: new Date().toISOString() },
      });
    }),
  );

  return router;
}

export default createSubmissionRouter();
