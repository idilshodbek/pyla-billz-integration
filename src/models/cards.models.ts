import mongoose, { Schema, Document } from 'mongoose';

export interface ICard extends Document {
  name: string;
  externalID?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Schema.Types.ObjectId;
}

const cardSchema = new Schema({
  name: { type: String, required: true },
  externalID: { type: String },
  isActive: { type: Boolean, required: true, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const CardsModel = mongoose.model<ICard>('Card', cardSchema);

export default CardsModel;
