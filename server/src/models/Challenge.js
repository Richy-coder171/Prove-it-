import mongoose from 'mongoose';

const criterionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  weight: { type: Number, required: true, min: 0, max: 100 },
  description: { type: String, required: true },
  levels: {
    excellent: { type: String, required: true },
    good: { type: String, required: true },
    weak: { type: String, required: true },
  },
}, { _id: false });

const challengeSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  mode: { type: String, enum: ['hiring', 'founder'], default: 'hiring', required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  sourceText: { type: String, required: true, maxlength: 20_000 },
  roleTitle: { type: String, trim: true },
  skill: { type: String, required: true },
  level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], required: true },
  taskType: { type: String, enum: ['code', 'analysis', 'writing', 'plan'], required: true },
  taskMarkdown: { type: String, required: true },
  starterCode: { type: String },
  timeLimitMinutes: { type: Number, min: 15, max: 60, required: true },
  rubric: {
    criteria: { type: [criterionSchema], required: true },
    notes: { type: String, default: '' },
  },
  followupSeeds: [{ type: String }],
  suggestedTags: [{ type: String }],
  allowAiOpen: { type: Boolean, default: false },
  status: { type: String, enum: ['draft', 'approved', 'closed'], default: 'draft', index: true },
  approvedAt: { type: Date },
  mentorFeedback: [{ mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, text: String, createdAt: Date }],
  variantOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' },
}, { timestamps: true });

export default mongoose.model('Challenge', challengeSchema);
