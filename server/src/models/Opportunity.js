import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  kind: { type: String, enum: ['job', 'founder_idea', 'challenge'], required: true },
  title: { type: String, required: true }, org: { type: String, required: true }, description: String,
  tags: [String], challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' },
}, { timestamps: true });
export default mongoose.model('Opportunity', schema);
