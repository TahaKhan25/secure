const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    action: String,
    status: String
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', logSchema);
