import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IProduct {
  productID: string;
  name: any;
  imageUrl?: string;
  COLOR?: string;
  SIZE?: string;
  sku: string;
  barCode: string;
  qty: number;
  subTotalPrice: number;
  discountAmount: number;
  totalPrice: number;
}

export interface IDeliveryAddress {
  street?: string;
  city?: string;
  postalCode?: string;
  fullAddress?: string;
  apartment?: string;
  floor?: string;
  entrance?: string;
  intercom?: string;
  landmark?: string;
}

export interface ICoordinates {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

export interface IMapData {
  placeId?: string;
  geocodedAddress?: string;
  mapProvider?: "google" | "yandex";
}

export interface IDeliveryInstructions {
  specialInstructions?: string;
  preferredTime?: string;
  contactMethod?: string;
}

export interface IOrder extends Document {
  datePaid?: Date;
  amoCrmId?: string;
  billzId?: string;
  billzAmount?: string;
  paidAmount?: number;
  orderID?: string;
  order_number?: string;
  tgMsgId?: string;
  orderAcceptedByManager: boolean;
  instagram?: string;
  isRefund: boolean;
  isPostPonement: boolean;
  postPonementDate?: Date;
  billzStoreID?: string;
  isPaid: boolean;
  deliveryStatus: "pending" | "packaging" | "packaged" | "delivering" | "delivered";
  comment?: string;
  deliveryComment?: string;
  deliveryTime?: Date;
  storeId?: Types.ObjectId;
  store?: string;
  utm_store_source?: string;
  paymentMethod: string;
  orderType: "mytaxi" | "mytaxi_paid" | "uzpost" | "point_of_sale" | "delivery" | "delivery_paid" | "location" | "Yandex" | "Yandex_paid" | "province" | "province_paid" | "emu" | "bts";
  subTotalPrice: number;
  totalPrice: number;
  discountAmount?: number;
  deliverySubTotalPrice?: number;
  products: IProduct[];
  closedPackager?: Types.ObjectId;
  regionId?: Types.ObjectId;
  subRegionId?: Types.ObjectId;
  driverId?: Types.ObjectId;
  userId?: Types.ObjectId;
  images?: any[][];
  region?: string;
  subRegion?: string;
  employeeID?: string;
  acceptedManager?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  clientID?: string;
  clientInfo?: any;
  clientIdSys?: Types.ObjectId;
  deliveryAddress?: IDeliveryAddress;
  coordinates?: ICoordinates;
  mapData?: IMapData;
  deliveryInstructions?: IDeliveryInstructions;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema({
  datePaid: { type: Date },
  amoCrmId: { type: String },
  billzId: { type: String },
  billzAmount: { type: String },
  paidAmount: { type: Number },
  orderID: { type: String },
  order_number: { type: String },
  tgMsgId: { type: String },
  orderAcceptedByManager: { type: Boolean, default: false, required: true },
  instagram: { type: String },
  isRefund: { type: Boolean, default: false, required: true },
  isPostPonement: { type: Boolean, default: false, required: true },
  postPonementDate: { type: Date },
  billzStoreID: { type: String },
  isPaid: { type: Boolean, default: false, required: true },
  deliveryStatus: { type: String, enum: ["pending", "packaging", "packaged", "delivering", "delivered"], default: "pending" },
  comment: { type: String },
  deliveryComment: { type: String },
  deliveryTime: { type: Date },
  storeId: { type: Types.ObjectId, ref: 'Stores' },
  store: { type: String },
  utm_store_source: { type: String },
  paymentMethod: { type: String, default: 'online', required: true },
  orderType: { type: String, enum: ["mytaxi", "mytaxi_paid", "uzpost", "point_of_sale", "delivery", "delivery_paid", "location", "Yandex", "Yandex_paid", "province", "province_paid", "emu", "bts"], default: "delivery" },
  subTotalPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  discountAmount: { type: Number },
  deliverySubTotalPrice: { type: Number },
  products: [
    {
      "productID": { type: String, required: true },
      "name": { type: Object, required: true },
      "imageUrl": { type: String },
      "COLOR": { type: String },
      "SIZE": { type: String },
      "sku": { type: String, required: true },
      "barCode": { type: String, required: true },
      "qty": { type: Number, required: true },
      "subTotalPrice": { type: Number, required: true },
      "discountAmount": { type: Number, required: true },
      "totalPrice": { type: Number, required: true }
    }
  ],
  closedPackager: { type: Types.ObjectId, ref: 'User' },
  regionId: { type: Types.ObjectId, ref: 'Region' },
  subRegionId: { type: Types.ObjectId, ref: 'Region' },
  driverId: { type: Types.ObjectId, ref: 'Driver' },
  userId: { type: Types.ObjectId, ref: 'User' },
  images: [{ type: Array }],
  region: { type: String },
  subRegion: { type: String },
  employeeID: { type: String },
  acceptedManager: { type: Types.ObjectId, ref: 'User' },
  createdBy: { type: Types.ObjectId, ref: 'User' },
  clientID: { type: String },
  clientInfo: { type: Object },
  clientIdSys: { type: Types.ObjectId, ref: 'Client' },

  deliveryAddress: {
    street: { type: String },
    city: { type: String },
    postalCode: { type: String },
    fullAddress: { type: String },
    apartment: { type: String },
    floor: { type: String },
    entrance: { type: String },
    intercom: { type: String },
    landmark: { type: String }
  },
  coordinates: {
    latitude: { type: Number },
    longitude: { type: Number },
    accuracy: { type: Number }
  },
  mapData: {
    placeId: { type: String },
    geocodedAddress: { type: String },
    mapProvider: { type: String, enum: ["google", "yandex"] }
  },
  deliveryInstructions: {
    specialInstructions: { type: String },
    preferredTime: { type: String },
    contactMethod: { type: String }
  },
  
}, { timestamps: true });

// Indexes for better performance
orderSchema.index({ "coordinates": "2dsphere" });
orderSchema.index({ "deliveryStatus": 1 });
orderSchema.index({ "createdAt": 1 });
orderSchema.index({ "updatedAt": 1 });
orderSchema.index({ "orderID": 1 });
orderSchema.index({ "order_number": 1 });
orderSchema.index({ "clientID": 1 });
orderSchema.index({ "clientIdSys": 1 });
orderSchema.index({ "storeId": 1 });
orderSchema.index({ "regionId": 1 });
orderSchema.index({ "subRegionId": 1 });
orderSchema.index({ "driverId": 1 });
orderSchema.index({ "deliveryTime": 1 });
orderSchema.index({ "isPaid": 1 });
orderSchema.index({ "isRefund": 1 });

const OrdersModel = mongoose.model<IOrder>('Order', orderSchema);

export default OrdersModel;
