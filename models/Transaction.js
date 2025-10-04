import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
    productName: { type: String, required: true },
    productPrice: { type: Number, required: true },
    adminName: { type: String, required: true },
    buyerNumber: { type: String, required: true },
    transactionCode: { type: String, required: true, unique: true },
    hasActivePeriod: { type: Boolean, required: true },
    activeDuration: { type: Number },
    activeUnit: { type: String, enum: ['days', 'weeks', 'months'] },
    activeExpiryDate: { type: Date },
    hasWarranty: { type: Boolean, required: true },
    warrantyDuration: { type: Number },
    warrantyUnit: { type: String, enum: ['days', 'weeks', 'months'] },
    warrantyExpiryDate: { type: Date },
}, {
    timestamps: true // This will automatically add a `createdAt` field
});

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);

export default Transaction;
