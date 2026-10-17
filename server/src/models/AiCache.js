import mongoose from 'mongoose';
const schema = new mongoose.Schema({ key: { type: String, unique: true, required: true }, response: { type: mongoose.Schema.Types.Mixed, required: true } }, { timestamps: true });
export default mongoose.model('AiCache', schema);
