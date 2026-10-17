import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true },
  reason: { type: String, required: true, maxlength: 2000 }, status: { type: String, enum: ['open', 'resolved'], default: 'open' },
}, { timestamps: true });
export default mongoose.model('ReReview', schema);
