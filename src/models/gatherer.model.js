import { Schema, model } from 'mongoose';

const GathererSchema = new Schema(
  {
    fullName: { type: String, required: [true, 'El nombre es necesario.'] },
    email: { type: String, unique: true, required: [true, 'El email es necesario.'] },
    phone: { type: String, required: [true, 'El phone es necesario.'] },
    address: { type: String, required: [true, 'El address es necesario.'] },
    department: { type: String, required: [true, 'El department es necesario.'] },
    municipality: { type: String, required: [true, 'El municipality es necesario.'] },
    dui: { type: String, required: [true, 'El dui es necesario.'] },
    status: { type: String, type: String, required: false, default: 'validation-pending' },
    userID: { ref: "User", type: Schema.Types.ObjectId, required: false, default: null },
    imgs: [{ type: String }],
    roles: [{ ref: "Roles", type: Schema.Types.ObjectId }]
  }, { timestamps: true, versionKey: false }
)


export default model('Gatherer', GathererSchema);