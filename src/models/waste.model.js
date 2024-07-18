import  {Schema, model} from 'mongoose';

const wasteSchema = new Schema(
  {
    wasteName: {type: String, unique: true, required: [true, 'waste name is required.']},
    description: {
      type: String,
      required: false,
      default: null
    },
    category: {ref: "Category", type: Schema.Types.ObjectId}
  },{timestamps: true, versionKey: false}
)



export default model('Waste', wasteSchema);