import dbConnect from '../../lib/mongodb';
import Transaction from '../../models/Transaction';
import { add, addWeeks, addMonths } from 'date-fns';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import nodeHtmlToImage from 'node-html-to-image';
import path from 'path';
import fs from 'fs';

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
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = 'KNT-';
    const length = Math.floor(Math.random() * 5) + 8; // 8-12 random letters
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

export default async function handler(req, res) {
    await dbConnect();

    // POST: Logika untuk mencatat transaksi baru (hanya untuk admin)
    if (req.method === 'POST') {
        if (!authenticate(req)) {
            return res.status(401).json({ success: false, error: 'Akses ditolak. Silakan login sebagai admin.' });
        }

        const {
            productName,
            productPrice,
            adminName,
            buyerNumber,
            hasActivePeriod,
            activeDuration,
            activeUnit,
            hasWarranty,
            warrantyDuration,
            warrantyUnit
        } = req.body;

        // Validasi input wajib
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
                productName,
                productPrice,
                adminName,
                buyerNumber,
                transactionCode,
                hasActivePeriod,
                activeDuration: hasActivePeriod ? parseInt(activeDuration) : null,
                activeUnit: hasActivePeriod ? activeUnit : null,
                activeExpiryDate: hasActivePeriod ? activeExpiryDate : null,
                hasWarranty,
                warrantyDuration: hasWarranty ? parseInt(warrantyDuration) : null,
                warrantyUnit: hasWarranty ? warrantyUnit : null,
                warrantyExpiryDate: hasWarranty ? warrantyExpiryDate : null,
            });

            const htmlTemplate = `
                <style>
                    body { font-family: 'Poppins', sans-serif; background-color: #1a1a1a; color: #e0e0e0; padding: 20px; }
                    .receipt-container { 
                        width: 350px; 
                        background-color: #1c1c1c; 
                        border: 2px solid #00BFFF; 
                        border-radius: 10px; 
                        padding: 20px; 
                        box-shadow: 0 0 15px rgba(0, 191, 255, 0.4); 
                        text-align: left; 
                    }
                    .header { text-align: center; margin-bottom: 20px; }
                    .header h1 { 
                        color: #00BFFF; 
                        font-size: 1.8rem; 
                        margin: 0; 
                        text-shadow: 0 0 8px rgba(0, 191, 255, 0.5); 
                    }
                    p { margin: 5px 0; font-size: 1rem; }
                    strong { color: #00FFFF; font-weight: 600; }
                    .divider { height: 1px; background-color: #555; margin: 15px 0; }
                </style>
                <body>
                    <div class="receipt-container">
                        <div class="header"><h1>Toko Elektronik Neon</h1></div>
                        <p><strong>Kode Transaksi:</strong> ${transaction.transactionCode}</p>
                        <p><strong>Admin:</strong> ${transaction.adminName}</p>
                        <p><strong>Nomor Pembeli:</strong> ${transaction.buyerNumber}</p>
                        <div class="divider"></div>
                        <p><strong>Nama Produk:</strong> ${transaction.productName}</p>
                        <p><strong>Harga:</strong> Rp${transaction.productPrice.toLocaleString('id-ID')}</p>
                        <div class="divider"></div>
                        ${transaction.hasActivePeriod ? `
                            <p><strong>Masa Aktif:</strong> ${transaction.activeDuration} ${transaction.activeUnit}</p>
                            <p><strong>Aktif Hingga:</strong> ${new Date(transaction.activeExpiryDate).toLocaleDateString('id-ID')}</p>
                            <div class="divider"></div>
                        ` : ''}
                        ${transaction.hasWarranty ? `
                            <p><strong>Masa Garansi:</strong> ${transaction.warrantyDuration} ${transaction.warrantyUnit}</p>
                            <p><strong>Garansi Hingga:</strong> ${new Date(transaction.warrantyExpiryDate).toLocaleDateString('id-ID')}</p>
                        ` : ''}
                    </div>
                </body>
            `;

            const receiptImageBuffer = await nodeHtmlToImage({
                html: htmlTemplate,
                puppeteerArgs: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
            });
            
            const base64Image = `data:image/png;base64,${receiptImageBuffer.toString('base64')}`;

            res.status(201).json({ success: true, data: transaction, receiptImageUrl: base64Image });

        } catch (error) {
            if (error.code === 11000) {
                return res.status(409).json({ success: false, error: 'Kode transaksi sudah terdaftar.' });
            }
            console.error('Error saving transaction or creating image:', error);
            res.status(500).json({ success: false, error: 'Terjadi kesalahan pada server.' });
        }
    } 
    // GET: Logika untuk pencarian dan cek transaksi (bisa diakses member & admin)
    else if (req.method === 'GET') {
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
            
            if (q) {
                const searchRegex = new RegExp(q, 'i');
                transactions = await Transaction.find({
                    $or: [
                        { productName: searchRegex },
                        { adminName: searchRegex },
                        { buyerNumber: searchRegex },
                        { transactionCode: searchRegex },
                    ]
                });
                return res.status(200).json({ success: true, transactions });
            }

            return res.status(400).json({ success: false, error: 'Parameter pencarian tidak valid.' });

        } catch (error) {
            console.error('Error saat mencari transaksi:', error);
            res.status(500).json({ success: false, error: 'Terjadi kesalahan pada server.' });
        }
    } else {
        res.status(405).json({ success: false, error: 'Metode tidak diizinkan.' });
    }
}
