const mongoose = require('mongoose');

const txSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    amount: Number,
    type: String,
    hash: String
}, { timestamps: true });

module.exports = mongoose.model('Transaction', txSchema);
