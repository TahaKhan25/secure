// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');       // user model
const AuditLog = require('../models/AuditLog'); // audit log
const { encrypt } = require('../utils/encrypt');

const router = express.Router();

// ---------------- SIGNUP ----------------
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Prevent users from assigning themselves 'admin'
        const assignedRole = role === 'admin' ? 'user' : role || 'user';

        const hash = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            name,
            email,
            passwordHash: hash,
            walletBalance: encrypt('0'),
            role: assignedRole
        });

        res.status(201).json({
            msg: 'Signup successful',
            role: assignedRole
        });
    } catch (err) {
        console.error(err);
        if (err.code === 11000) {
            return res.status(400).json({ msg: 'Email already exists' });
        }
        res.status(500).json({ msg: 'Error during signup' });
    }
});

// ---------------- LOGIN ----------------
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1️⃣ Find user
        const user = await User.findOne({ email });
        if (!user) {
            await AuditLog.create({ userId: null, action: 'login', status: 'fail' });
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // 2️⃣ Check password
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            user.failedLogins += 1;
            await user.save();

            await AuditLog.create({ userId: user._id, action: 'login', status: 'fail' });
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // 3️⃣ Reset failedLogins on success
        user.failedLogins = 0;
        await user.save();

        // 4️⃣ Log successful login
        await AuditLog.create({ userId: user._id, action: 'login', status: 'success' });

        // 5️⃣ Create JWT token
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        // 6️⃣ Return token + role for frontend redirection
        res.json({ token, role: user.role });

    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error during login' });
    }
});

module.exports = router;
