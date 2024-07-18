import { Schema, model } from 'mongoose';

const CompaniesSchema = new Schema(
  {
    email: { type: String, unique: true, required: [true, 'El email es necesario.'] },
    businessName: { type: String, required: [true, 'El businessName es necesario.'] },
    branchEncargado: { type: String },
    country: { type: String, required: [true, 'El país es necesario.'] },
    phone: { type: String, required: [true, 'La teléfono es necesario.'] },
    mobile_number: { type: String, required: [true, 'La teléfono es necesario.'] },
    address: { type: String, required: [true, 'El address es necesario.'] },
    department: { type: String, required: [true, 'El department es necesario.'] },
    municipality: { type: String, required: [true, 'El municipality es necesario.'] },
    contactFullName: { type: String, required: [true, 'El contactFullName es necesario.'] },
    contactPhone: { type: String, required: [true, 'El contactPhone es necesario.'] },
    contactEmail: { type: String, required: [true, 'El contactEmail es necesario.'] },
    ownerID: { ref: "User", type: Schema.Types.ObjectId, required: false, default: null },
    nit: { type: String },
    nrc: { type: String },
    bank_name: { type: String },
    bank_owner: { type: String },
    bank_type_account: { type: String },
    bank_number: { type: String },
    billing_type: { type: String, },
    billing_period: { type: String, },
    imgs: [{ type: String }],
    status: { type: String, type: String, required: false, default: 'validation-pending' },
    isNewCompany: { type: Boolean, required: false, default: true },
  }, { timestamps: true, versionKey: false }
)

export default model('Companies', CompaniesSchema);