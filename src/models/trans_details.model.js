import {Schema, model} from 'mongoose';


const TransSchema = new Schema(
  {
    cliente_Trans_Monto: {type: String},
    cliente_Trans_Trantime: {type: String},
    cliente_Trans_Referencia: {type: String},
    cliente_Trans_Auditno: {type: String},
    cliente_Trans_Tipomensaje: {type: String},
    cliente_Trans_Terminalid: {type: String},
    cliente_Trans_Networkid: {type: String},
    cliente_Trans_Respuesta: {type: String},
    cliente_Trans_Autoriza: {type: String},
    cliente_Trans_Trandate: {type: String},
    payID: {ref: "Pay", type: Schema.Types.ObjectId, required: true },
    userID: {ref: "User", type: Schema.Types.ObjectId, required: true },


  },{timestamps: true, versionKey: false}
)

export default model('Trans', TransSchema); 