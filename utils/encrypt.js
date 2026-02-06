const crypto = require('crypto');
const key = Buffer.from(process.env.AES_SECRET);

exports.encrypt = (text) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
};

exports.decrypt = (text) => {
    const [ivHex, encrypted] = text.split(':');
    const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        key,
        Buffer.from(ivHex, 'hex')
    );
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};
