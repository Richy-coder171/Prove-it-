import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true },
  mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxlength: 280 }, rating: { type: Number, min: 1, max: 5, required: true },
}, { timestamps: true });
schema.index({ submission: 1, mentor: 1 }, { unique: true });
export default mongoose.model('Endorsement', schema);
