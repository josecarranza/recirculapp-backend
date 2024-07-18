import { Schema, model } from 'mongoose';

const StatisticsSchema = new Schema({
    date: { type: Date, default: Date.now },
    userId: { type: String, required: true },
    TON: { type: Number, required: true },
    TON_CO2: { type: Number, required: true },
    TOTAL_LB: { type: Number, required: true },
    MJ_ENERGIA: { type: Number, required: true },
    M_AGUA: { type: Number, required: true },
    ARBOLES: { type: Number, required: true },
    ROLE: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default model('Statistics', StatisticsSchema);
