import  {Schema, model} from 'mongoose';

const TestsSchema = new Schema(
  {
    email: {type: String},
    username: {type: String},
    imgs: [{type: String}],
    
  },{timestamps: true, versionKey: false}
)

export default model('Tests', TestsSchema);