import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
  submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true },
  status: { type: String, enum: ['shortlisted', 'hired', 'rejected'], default: 'shortlisted' }, note: String,
}, { timestamps: true });
schema.index({ challenge: 1, submission: 1 }, { unique: true });
export default mongoose.model('Shortlist', schema);
