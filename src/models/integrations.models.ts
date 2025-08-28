import mongoose, { Schema } from 'mongoose';

const integrationsSchema = new Schema({
  type: { type: String, required: true },
  link: { type: String },
  token: { type: String },
  isActive: { type: Boolean, required: true, default: false },
  serviceID: { type: String },
  access_token: { type: String },
  refresh_token: { type: String },
  shop_id: { type: String },
  lost_status_id: { type: String },
  success_status_id: { type: String },
  expire_date: { type: Date },
  postponed_status_id: { type: String },
  new_status_id: { type: String },
  domain: { type: String },
  telegram_bot_token: { type: String },
  telegram_bot_token_packagers: { type: String },
  telegram_issue_group_id: { type: String },
  telegram_external_delivery_group_id: { type: String },
  telegram_supervisor_group_id: { type: String },
  login: { type: String },
  originator: { type: String },
  password: { type: String },
  username: { type: String },
  inn: { type: String },
  pixel_id: { type: String },
  analytics_id: { type: String },
  metrika_id: { type: String },
  percentages: {
    3: {type: Number},
    6: {type: Number},
    12: {type: Number}
  }
}, { timestamps: true });

const integrationsModel = mongoose.model('integrations', integrationsSchema);

export default integrationsModel;