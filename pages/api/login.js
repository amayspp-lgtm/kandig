import jwt from 'jsonwebtoken';
import cookie from 'cookie';

const SECRET_KEY = process.env.ADMIN_SECRET_KEY;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed.' });
    }

    const { key } = req.body;
    if (key === SECRET_KEY) {
        const token = jwt.sign({ isAdmin: true }, SECRET_KEY, { expiresIn: '1h' });
        res.setHeader('Set-Cookie', cookie.serialize('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            maxAge: 60 * 60,
            path: '/',
        }));
        return res.status(200).json({ success: true, message: 'Login successful.' });
    } else {
        return res.status(401).json({ success: false, error: 'Invalid key.' });
    }
}