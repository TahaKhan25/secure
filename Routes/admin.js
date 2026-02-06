const express = require('express');                  // import Express
const router = express.Router();                     // create router
const auth = require('../utils/authMiddleware');     // JWT auth middleware
const role = require('../utils/roleMiddleware');     // role-based middleware
const Transaction = require('../models/Transaction'); // Transaction model

// Example: Only admin can see all transactions
router.get('/transactions', auth, role('admin'), async (req, res) => {
    try {
        const txs = await Transaction.find();
        res.json(txs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Error fetching transactions' });
    }
});

module.exports = router; // <-- export router
