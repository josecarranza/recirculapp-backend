import { Schema, model } from "mongoose";

const ReservedSchema = new Schema(
    {
        email: { type: String, required: [true, 'El email es necesario.'] },
        amount: { type: Number, required: [true, 'El monto es requerido.'] },
        reciboId: { type: String, required: [true, 'El recibo es requerido.'] },
        auditnoId: { type: String, required: [true, 'El auditno es requerido.'] },
        full_name: { type: String, required: [true, 'El email es necesario.'] },
        phone_number: { type: String, required: [true, 'El email es necesario.'] },
        userID: { ref: "User", type: Schema.Types.ObjectId, required: [true, 'El usuario es requerido.'] },
        orderID: { ref: "Order", type: Schema.Types.ObjectId, required: [true, 'La orden es requerido.'] },
    }, { timestamps: true, versionKey: false }
)

export default model('Reserved', ReservedSchema);