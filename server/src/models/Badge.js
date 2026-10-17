import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    verificationId: { type: String, unique: true, required: true },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    submission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Submission",
      unique: true,
      required: true,
    },
    challenge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Challenge",
      required: true,
    },
    skill: { type: String, required: true },
    level: { type: String, required: true },
    score: { type: Number, required: true },
    authenticity: {
      type: String,
      enum: ["high", "medium", "low"],
      required: true,
    },
    issuedAt: { type: Date, required: true },
    signature: { type: String, required: true, select: false },
    isPublic: { type: Boolean, default: true },
    showBreakdownPublicly: { type: Boolean, default: false },
    revoked: { type: Boolean, default: false },
    endorsement: { type: mongoose.Schema.Types.ObjectId, ref: "Endorsement" },
    attempt: Number,
  },
  { timestamps: true },
);
export default mongoose.model("Badge", schema);
