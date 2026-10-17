import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, required: true, enum: ['startup', 'candidate', 'mentor'] },
  fullName: { type: String, required: true, trim: true, maxlength: 120 },
  slug: { type: String, unique: true, sparse: true, lowercase: true },
  orgName: { type: String, trim: true, maxlength: 160 },
  headline: { type: String, trim: true, maxlength: 180 },
  bio: { type: String, trim: true, maxlength: 2000 },
  skills: [{ type: String, trim: true, maxlength: 60 }],
}, { timestamps: true });

export default mongoose.model('User', userSchema);
