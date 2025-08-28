import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema({
  phone: { type: Number, required: true },
  isActive: { type: Boolean, required: true, default: true },
  name: { type: String, required: true },
  externalID: { type: String },
  tgId: { type: String },
  capacity: { type: Number },
  isUserOnline: { type: Boolean, default: false },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stores' },
  password: { type: String, required: true },
  role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const UserModel = mongoose.model('User', userSchema);

export default UserModel;