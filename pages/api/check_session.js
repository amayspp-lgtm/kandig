import jwt from 'jsonwebtoken';
import cookie from 'cookie';

const SECRET_KEY = process.env.ADMIN_SECRET_KEY;

export default function handler(req, res) {
    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.auth_token;

    if (!token) {
        return res.status(401).json({ success: false, error: 'Session not found.' });
    }

    try {
        jwt.verify(token, SECRET_KEY);
        return res.status(200).json({ success: true, message: 'Session valid.' });
    } catch (e) {
        return res.status(401).json({ success: false, error: 'Invalid session.' });
    }
}