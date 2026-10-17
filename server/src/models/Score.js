import mongoose from 'mongoose';
const scoreSchema = new mongoose.Schema({
  submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true, unique: true },
  runs: [{ type: mongoose.Schema.Types.Mixed }],
  criteria: [{ id: String, name: String, weight: Number, score: Number, max: Number, evidence: [String], why: String }],
  total: Number, variance: Number, needsHumanReview: Boolean,
  authenticity: { type: String, enum: ['high', 'medium', 'low'] }, authenticityReasons: [String],
  graderConfidence: Number, summary: String,
  overrides: [{ criterionId: String, oldScore: Number, newScore: Number, reason: String, by: mongoose.Schema.Types.ObjectId, at: Date }],
  finalTotal: Number,
}, { timestamps: true });
export default mongoose.model('Score', scoreSchema);
