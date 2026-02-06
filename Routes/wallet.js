const express = require('express');
const auth = require('../utils/authMiddleware');
const User = require('../models/user');
const Transaction = require('../models/Transaction');
const { encrypt, decrypt } = require('../utils/encrypt');
const crypto = require('crypto');

const router = express.Router();

/* =========================
   GET BALANCE + COUNTS
========================= */
router.get('/balance', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        const balance = parseInt(decrypt(user.walletBalance));

        const transactionCount = await Transaction.countDocuments({
            userId: req.user.id
        });

        // Calculate totals
        const incomeAgg = await Transaction.aggregate([
            { $match: { userId: user._id, type: 'credit' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const expenseAgg = await Transaction.aggregate([
            {
                $match: {
                    userId: user._id,
                    type: { $in: ['library_fee', 'bus_fee'] }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        res.json({
            balance,
            transactionCount,
            totalIncome: incomeAgg[0]?.total || 0,
            totalSpent: expenseAgg[0]?.total || 0
        });

    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
});

/* =========================
   ADD FUNDS (CREDIT)
========================= */
router.post('/add', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        const current = parseInt(decrypt(user.walletBalance));
        const amount = parseInt(req.body.amount);

        const newBalance = current + amount;
        user.walletBalance = encrypt(newBalance.toString());
        await user.save();

        const hash = crypto
            .createHash('sha256')
            .update(req.user.id + amount + Date.now())
            .digest('hex');

        await Transaction.create({
            userId: req.user.id,
            amount,
            type: 'credit',
            hash
        });

        res.json({ msg: 'Amount added successfully' });

    } catch (err) {
        res.status(500).json({ msg: 'Transaction failed' });
    }
});

/* =========================
   PERFORM TRANSACTION (DEBIT)
========================= */
router.post('/spend', auth, async (req, res) => {
    try {
        const { category, amount } = req.body;

        if (!['library', 'bus'].includes(category)) {
            return res.status(400).json({ msg: 'Invalid category' });
        }

        const user = await User.findById(req.user.id);

        const current = parseInt(decrypt(user.walletBalance));
        const spendAmount = parseInt(amount);

        if (spendAmount > current) {
            return res.status(400).json({ msg: 'Insufficient balance' });
        }

        const newBalance = current - spendAmount;
        user.walletBalance = encrypt(newBalance.toString());
        await user.save();

        const hash = crypto
            .createHash('sha256')
            .update(req.user.id + spendAmount + Date.now())
            .digest('hex');

        await Transaction.create({
            userId: req.user.id,
            amount: spendAmount,
            type: category === 'library' ? 'library_fee' : 'bus_fee',
            hash
        });

        res.json({ msg: 'Transaction successful' });

    } catch (err) {
        res.status(500).json({ msg: 'Transaction failed' });
    }
});

/* =========================
   USER TRANSACTIONS
========================= */
router.get('/transactions', auth, async (req, res) => {
    try {
        const txs = await Transaction
            .find({ userId: req.user.id })
            .sort({ createdAt: -1 });

        res.json(txs);

    } catch (err) {
        res.status(500).json({ msg: 'Failed to load transactions' });
    }
});

module.exports = router;
