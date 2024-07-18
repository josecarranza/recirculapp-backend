import { Schema, model } from 'mongoose';

const OrderSchema = new Schema(
  {
    category: { ref: "Category", type: Schema.Types.ObjectId },
    date: { type: Date, default: null },
    hasta_dia: { type: Date, default: null },
    desde_dia: { type: Date, default: null },
    address: { type: String, required: [true, 'La dirección es requerida.'] },
    hora_fija: { type: String },
    hora_desde: { type: String },
    hora_hasta: { type: String },
    fecha_reservacion: { type: Date, default: null },
    fecha_recoleccion: { type: Date, default: null },
    fecha_conciliacion: { type: Date, default: null },
    departamento: { type: String },
    municipio: { type: String },
    order_n: { type: String, default: null },
    total: { type: Number, required: [true, 'El total es requerida.'] },
    totalEnterprice: { type: Number, required: [true, 'El totalEnterprice es requerida.'] },
    status: { type: String, default: 'reservation-pending' },
    companyID: { ref: "Companies", type: Schema.Types.ObjectId, required: [true, 'La empresa es requerido.'] },
    branchID: { ref: "Branch", type: Schema.Types.ObjectId, required: false, default: null },
    userID: { ref: "User", type: Schema.Types.ObjectId, required: [true, 'El usuario es requerido.'] },
    ownerID: [{ ref: "User", type: Schema.Types.ObjectId, required: false, default: [] }],
    subcategories: [
      {
        ownerID: { ref: "User", type: Schema.Types.ObjectId, required: false, default: null },
        subcategory: { ref: "SubCategory", type: Schema.Types.ObjectId },
        quantity: { type: Number, required: [true, 'La cantidad es requerida.'] },
        starting_weight: { type: Number },
        status: { type: String, default: 'reservation-pending' },
        subtotal: { type: String, required: [true, 'El precio es requerido'] },
        subtotalEnterprice: { type: String },
        comision_porcentaje: { type: Number },
        gatherer_invoice_status: { type: String, default: 'No Definido' },
        gatherer_bill_status: { type: String, default: 'No Definido' },
        gatherer_deliver_invoice: { type: String, default: 'No Definido' },
        client_invoice_status: { type: String, default: 'No Definido' },
        client_bill_status: { type: String, default: 'No Definido' },
        client_deliver_invoice: { type: String, default: 'No Definido' },
      }
    ],
    grandTotalEnterprice: {
      type: Number,
      default: 0
    },

  }, { timestamps: true, versionKey: false }
)

export default model('Order', OrderSchema); 