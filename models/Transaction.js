import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
    productName: { type: String, required: true },
    productPrice: { type: Number, required: true },
    adminName: { type: String, required: true },
    buyerNumber: { type: String, required: true },
    // serialNumber dihapus karena tidak digunakan lagi
    transactionCode: { type: String, required: true, unique: true },
    // purchaseDate dihapus, diganti dengan timestamps: true
    hasActivePeriod: { type: Boolean, required: true },
    activeDuration: { type: Number },
    activeUnit: { type: String, enum: ['days', 'weeks', 'months'] },
    activeExpiryDate: { type: Date },
    hasWarranty: { type: Boolean, required: true },
    warrantyDuration: { type: Number },
    warrantyUnit: { type: String, enum: ['days', 'weeks', 'months'] },
    warrantyExpiryDate: { type: Date },
}, {
    timestamps: true
});

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);

export default Transaction;