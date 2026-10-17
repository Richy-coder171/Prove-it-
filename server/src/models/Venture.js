import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    challenge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Challenge",
      required: true,
    },
    name: { type: String, required: true },
    oneLiner: { type: String, required: true },
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    memberSubmissions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Submission" },
    ],
  },
  { timestamps: true },
);
export default mongoose.model("Venture", schema);
