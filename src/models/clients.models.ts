import mongoose, { Schema } from 'mongoose';

const clientSchema = new Schema({
  phone: { type: Number, required: true },
  billzId: { type: String },
  firstName: { type: String, required: true },
  lastName: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  birthday: { type: Date },
}, { timestamps: true });

const ClientModel = mongoose.model('Client', clientSchema);

export default ClientModel;