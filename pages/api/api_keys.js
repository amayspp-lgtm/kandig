import dbConnect from '../../lib/mongodb';
import ApiKey from '../../models/ApiKey';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';

const SECRET_KEY = process.env.ADMIN_SECRET_KEY;

function authenticate(req) {
    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.auth_token;
    if (!token) return false;
    try {
        jwt.verify(token, SECRET_KEY);
        return true;
    } catch (e) {
        return false;
    }
}

export default async function handler(req, res) {
    if (!authenticate(req)) {
        return res.status(401).json({ success: false, error: 'Akses ditolak. Silakan login sebagai admin.' });
    }

    await dbConnect();

    switch (req.method) {
        case 'GET':
            try {
                const apiKeys = await ApiKey.find().sort({ priority: 1 });
                res.status(200).json({ success: true, data: apiKeys });
            } catch (error) {
                res.status(500).json({ success: false, error: 'Gagal mengambil data API Keys.' });
            }
            break;

        case 'POST':
            try {
                const { name, key, priority } = req.body;
                if (!name || !key || priority === undefined) {
                    return res.status(400).json({ success: false, error: 'Nama, kunci, dan prioritas harus diisi.' });
                }
                const newApiKey = await ApiKey.create({ name, key, priority });
                res.status(201).json({ success: true, data: newApiKey });
            } catch (error) {
                res.status(500).json({ success: false, error: 'Gagal menambahkan API Key.' });
            }
            break;

        case 'DELETE':
            try {
                const { id } = req.body;
                if (!id) {
                    return res.status(400).json({ success: false, error: 'ID tidak valid.' });
                }
                await ApiKey.findByIdAndDelete(id);
                res.status(200).json({ success: true, message: 'API Key berhasil dihapus.' });
            } catch (error) {
                res.status(500).json({ success: false, error: 'Gagal menghapus API Key.' });
            }
            break;

        default:
            res.status(405).json({ success: false, error: 'Metode tidak diizinkan.' });
            break;
    }
}