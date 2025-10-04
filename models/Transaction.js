import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
    productName: { type: String, required: true },
    productPrice: { type: Number, required: true },
    adminName: { type: String, required: true },
    buyerNumber: { type: String, required: true },
    serialNumber: { type: String, required: true, unique: true, trim: true },
    transactionCode: { type: String, required: true, unique: true },
    purchaseDate: { type: Date, required: true },
    warrantyDuration: { type: Number, required: true, min: 0 },
    warrantyUnit: { type: String, required: true, enum: ['days', 'weeks', 'months'] },
    warrantyExpiryDate: { type: Date, required: true },
}, {
    timestamps: true
});

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);

export default Transaction;