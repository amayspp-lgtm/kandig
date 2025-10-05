import dbConnect from '../../lib/mongodb';
import Transaction from '../../models/Transaction';
import { add, addWeeks, addMonths } from 'date-fns';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import ApiKey from '../../models/ApiKey'; // Impor model ApiKey
import fetch from 'node-fetch';

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

function generateTransactionCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'KNT-';
    const length = 10;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

export default async function handler(req, res) {
    await dbConnect();

    if (req.method === 'POST') {
        if (!authenticate(req)) {
            return res.status(401).json({ success: false, error: 'Akses ditolak. Silakan login sebagai admin.' });
        }

        const {
            productName, productPrice, adminName, buyerNumber, hasActivePeriod,
            activeDuration, activeUnit, hasWarranty, warrantyDuration, warrantyUnit
        } = req.body;

        if (!productName || !productPrice || !adminName || !buyerNumber) {
            return res.status(400).json({ success: false, error: 'Nama produk, harga, admin, dan nomor pembeli harus diisi.' });
        }
        if (hasActivePeriod && (!activeDuration || !activeUnit)) {
            return res.status(400).json({ success: false, error: 'Masa aktif harus diisi jika dicentang.' });
        }
        if (hasWarranty && (!warrantyDuration || !warrantyUnit)) {
            return res.status(400).json({ success: false, error: 'Masa garansi harus diisi jika dicentang.' });
        }

        const today = new Date();
        let activeExpiryDate = null;
        if (hasActivePeriod) {
            switch (activeUnit) {
                case 'days':
                    activeExpiryDate = add(today, { days: parseInt(activeDuration) });
                    break;
                case 'weeks':
                    activeExpiryDate = addWeeks(today, parseInt(activeDuration));
                    break;
                case 'months':
                    activeExpiryDate = addMonths(today, parseInt(activeDuration));
                    break;
            }
        }
        
        let warrantyExpiryDate = null;
        if (hasWarranty) {
            switch (warrantyUnit) {
                case 'days':
                    warrantyExpiryDate = add(today, { days: parseInt(warrantyDuration) });
                    break;
                case 'weeks':
                    warrantyExpiryDate = addWeeks(today, parseInt(warrantyDuration));
                    break;
                case 'months':
                    warrantyExpiryDate = addMonths(today, parseInt(warrantyDuration));
                    break;
            }
        }

        let transactionCode;
        let isCodeUnique = false;
        while (!isCodeUnique) {
            transactionCode = generateTransactionCode();
            const existingTransaction = await Transaction.findOne({ transactionCode });
            if (!existingTransaction) {
                isCodeUnique = true;
            }
        }

        try {
            const transaction = await Transaction.create({
                productName, productPrice, adminName, buyerNumber, transactionCode,
                hasActivePeriod, activeDuration: hasActivePeriod ? parseInt(activeDuration) : null,
                activeUnit: hasActivePeriod ? activeUnit : null, activeExpiryDate: hasActivePeriod ? activeExpiryDate : null,
                hasWarranty, warrantyDuration: hasWarranty ? parseInt(warrantyDuration) : null,
                warrantyUnit: hasWarranty ? warrantyUnit : null, warrantyExpiryDate: hasWarranty ? warrantyExpiryDate : null,
            });

            // Ambil semua API Keys dari database, diurutkan berdasarkan prioritas
            const invoiceApiKeys = await ApiKey.find().sort({ priority: 1 });

            let invoiceUrl = null;
            let success = false;

            for (const api of invoiceApiKeys) {
                try {
                    const invoicePayload = {
                        to: transaction.buyerNumber,
                        logo: 'https://example.com/logo.png',
                        number: transaction.transactionCode,
                        date: new Date().toLocaleDateString('en-US'),
                        items: [
                            {
                                name: transaction.productName,
                                quantity: 1,
                                unit_cost: transaction.productPrice,
                                description: `Masa Aktif: ${transaction.activeDuration || 'N/A'} ${transaction.activeUnit || ''} \nMasa Garansi: ${transaction.warrantyDuration || 'N/A'} ${transaction.warrantyUnit || ''}`
                            }
                        ],
                        notes: `Admin: ${transaction.adminName}`
                    };

                    const invoiceApiResponse = await fetch('https://invoice-generator.com', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${api.key}`
                        },
                        body: JSON.stringify(invoicePayload),
                    });
                    
                    if (!invoiceApiResponse.ok) {
                        console.error(`API Invoice with key ${api.name} failed with status: ${invoiceApiResponse.status}`);
                        continue;
                    }

                    invoiceUrl = invoiceApiResponse.url;
                    success = true;
                    break;
                } catch (error) {
                    console.error(`Error saat mencoba kunci API: ${api.name}`, error);
                }
            }

            if (success) {
                res.status(201).json({ success: true, data: transaction, invoiceUrl: invoiceUrl });
            } else {
                res.status(500).json({ success: false, error: 'Gagal membuat invoice setelah mencoba semua kunci API.' });
            }

        } catch (error) {
            console.error('Error saving transaction or creating invoice:', error);
            res.status(500).json({ success: false, error: 'Terjadi kesalahan pada server.' });
        }
    } else if (req.method === 'GET') {
        const { q, transactionCode } = req.query;

        try {
            let transactions;
            if (transactionCode) {
                transactions = await Transaction.findOne({ transactionCode: transactionCode.toUpperCase() });
                if (!transactions) {
                    return res.status(404).json({ success: false, transaction: null, error: 'Kode transaksi tidak ditemukan.' });
                }
                return res.status(200).json({ success: true, transaction: transactions });
            }
            
            if (q === 'all') {
                transactions = await Transaction.find().sort({ createdAt: -1 });
            } else if (q) {
                const searchRegex = new RegExp(q, 'i');
                transactions = await Transaction.find({
                    $or: [
                        { productName: searchRegex },
                        { adminName: searchRegex },
                        { buyerNumber: searchRegex },
                        { transactionCode: searchRegex },
                    ]
                });
            }

            return res.status(200).json({ success: true, transactions });

        } catch (error) {
            console.error('Error saat mencari transaksi:', error);
            res.status(500).json({ success: false, error: 'Terjadi kesalahan pada server.' });
        }
    } else {
        res.status(405).json({ success: false, error: 'Metode tidak diizinkan.' });
    }
}