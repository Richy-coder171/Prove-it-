import mongoose from "mongoose";

const followupSchema = new mongoose.Schema(
  {
    qid: { type: String, required: true },
    question: { type: String, required: true },
    targets: [String],
    difficulty: { type: String, enum: ["base", "probe", "twist"] },
    answerTranscript: { type: String, maxlength: 10_000 },
    audioFileId: mongoose.Schema.Types.ObjectId,
    answeredAt: Date,
    answeredBy: { type: String, enum: ["voice", "text"] },
  },
  { _id: false },
);
const submissionSchema = new mongoose.Schema(
  {
    challenge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Challenge",
      required: true,
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    attempt: { type: Number, default: 1, min: 1, max: 3 },
    status: {
      type: String,
      enum: [
        "in_progress",
        "submitted",
        "defending",
        "grading",
        "graded",
        "error",
      ],
      default: "in_progress",
    },
    startedAt: { type: Date, required: true },
    deadlineAt: { type: Date, required: true },
    answerText: { type: String, maxlength: 20_000, default: "" },
    submittedAt: Date,
    followups: [followupSchema],
    integrity: {
      tabBlurCount: { type: Number, default: 0 },
      pasteEvents: [{ at: Date, length: Number }],
    },
  },
  { timestamps: true },
);
submissionSchema.index(
  { challenge: 1, candidate: 1, attempt: 1 },
  { unique: true },
);
export default mongoose.model("Submission", submissionSchema);
