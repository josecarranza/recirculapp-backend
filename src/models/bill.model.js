import  {Schema, model} from 'mongoose';

const billSchema = new Schema(
  {
    url: {type: String},
    url_admin: {type: String},
    orderID: {ref: "Order", type: Schema.Types.ObjectId, required: false, default: null },
    subOrderIDs: [{ type: Schema.Types.ObjectId, required: false, default: [] }],
  },{timestamps: true, versionKey: false}
)

export default model('Bill', billSchema);