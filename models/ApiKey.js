import mongoose from 'mongoose';

const ApiKeySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    key: { type: String, required: true },
    priority: { type: Number, required: true, default: 0 } // Prioritas: 0 (utama), 1, 2, dst.
});

const ApiKey = mongoose.models.ApiKey || mongoose.model('ApiKey', ApiKeySchema);

export default ApiKey;
