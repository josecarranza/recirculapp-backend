import {Schema, model} from 'mongoose';

export const ROLES = ['customer', 'enterprise', 'admin', 'gatherer', 'branch'];

const RoleSchema = new Schema(
  {
    name: {type: String, unique: true, required: [true, 'El nombre es necesario.']},
  },{timestamps: true, versionKey: false}
)

export default model('Roles', RoleSchema); 