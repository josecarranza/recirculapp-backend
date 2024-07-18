import { Schema, model } from 'mongoose';

const branchSchema = new Schema(
  {
    email: { type: String, unique: true, required: [true, 'El email es necesario.'] },
    date: { type: String },
    branchName: { type: String, required: [true, 'El businessName es necesario.'] },
    branchEncargado: { type: String, required: [true, 'El branchEncargado es necesario.'] },
    address: { type: String, required: [true, 'La dirección es necesario.'] },
    department: { type: String, required: [true, 'El departemando es necesario.'] },
    country: { type: String, required: [true, 'El país es necesario.'] },
    phone: { type: String, required: [true, 'La teléfono es necesario.'] },
    mobile_number: { type: String, required: [true, 'La teléfono es necesario.'] },
    municipality: { type: String, required: [true, 'El municipio es necesario.'] },
    companyID: { ref: "Companies", type: Schema.Types.ObjectId, required: [true, 'La compania es necesaria.'] },
    ownerID: { ref: "User", type: Schema.Types.ObjectId, required: false, default: null },
    status: { type: String, type: String, required: false, default: 'validation-pending' },
    latitude: { type: String, required: false, default: null },
    longitude: { type: String, required: false, default: null },
    zone: { type: String, required: false, default: 3 },
  }, { timestamps: true, versionKey: false }
)

export default model('Branch', branchSchema);