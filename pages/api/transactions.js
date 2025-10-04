import dbConnect from '../../lib/mongodb';
import Transaction from '../../models/Transaction';
import { add, addWeeks, addMonths } from 'date-fns';
import path from 'path';
import fs from 'fs';
import nodeHtmlToImage from 'node-html-to-image';
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

function generateTransactionCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = 'KNT-';
    const length = Math.floor(Math.random() * 5) + 8;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

export default async function handler(req, res) {
    await dbConnect();

    // HANYA melindungi endpoint POST
    if (req.method === 'POST') {
        if (!authenticate(req)) {
            return res.status(401).json({ success: false, error: 'Access denied. Please login as admin.' });
        }
    
        const { productName, productPrice, adminName, buyerNumber, serialNumber, purchaseDate, warrantyDuration, warrantyUnit } = req.body;
    
        if (!productName || !productPrice || !adminName || !buyerNumber || !serialNumber || !purchaseDate || warrantyDuration === undefined || !warrantyUnit) {
            return res.status(400).json({ success: false, error: 'All fields must be filled.' });
        }
    
        const purchaseDateTime = new Date(purchaseDate);
        let warrantyExpiryDate;
    
        switch (warrantyUnit) {
            case 'days':
                warrantyExpiryDate = add(purchaseDateTime, { days: warrantyDuration });
                break;
            case 'weeks':
                warrantyExpiryDate = addWeeks(purchaseDateTime, warrantyDuration);
                break;
            case 'months':
                warrantyExpiryDate = addMonths(purchaseDateTime, warrantyDuration);
                break;
            default:
                return res.status(400).json({ success: false, error: 'Invalid warranty unit.' });
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
                serialNumber: serialNumber.toUpperCase(),
                transactionCode,
                purchaseDate: purchaseDateTime,
                warrantyDuration,
                warrantyUnit,
                warrantyExpiryDate,
            });
    
            // Pastikan folder exists
            const publicDir = path.join(process.cwd(), 'public');
            const receiptsDir = path.join(publicDir, 'receipts');
            if (!fs.existsSync(receiptsDir)) {
                fs.mkdirSync(receiptsDir, { recursive: true });
            }
    
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
                .header img { max-width: 100px; margin-bottom: 10px; }
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
                  <div class="header">
                    <h1>Toko Elektronik Neon</h1>
                  </div>
                  <p><strong>Kode Transaksi:</strong> ${transaction.transactionCode}</p>
                  <p><strong>Admin:</strong> ${transaction.adminName}</p>
                  <p><strong>Nomor Pembeli:</strong> ${transaction.buyerNumber}</p>
                  <div class="divider"></div>
                  <p><strong>Nama Produk:</strong> ${transaction.productName}</p>
                  <p><strong>Harga:</strong> Rp${transaction.productPrice.toLocaleString('id-ID')}</p>
                  <p><strong>Nomor Seri:</strong> ${transaction.serialNumber}</p>
                  <div class="divider"></div>
                  <p><strong>Tanggal Pembelian:</strong> ${new Date(transaction.purchaseDate).toLocaleDateString('id-ID')}</p>
                  <p><strong>Masa Garansi:</strong> ${transaction.warrantyDuration} ${transaction.warrantyUnit}</p>
                  <p><strong>Garansi Berakhir:</strong> ${new Date(transaction.warrantyExpiryDate).toLocaleDateString('id-ID')}</p>
                </div>
              </body>
            `;
    
            const outputPath = path.join(receiptsDir, `${transaction._id}.png`);
            await nodeHtmlToImage({
                output: outputPath,
                html: htmlTemplate,
                puppeteerArgs: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
            });
    
            const imageUrl = `/receipts/${transaction._id}.png`;
            res.status(201).json({ success: true, data: transaction, receiptImageUrl: imageUrl });
    
        } catch (error) {
            if (error.code === 11000) {
                return res.status(409).json({ success: false, error: 'Serial number or transaction code already registered.' });
            }
            console.error('Error saving transaction or creating image:', error);
            res.status(500).json({ success: false, error: 'An error occurred on the server.' });
        }
    } else if (req.method === 'GET') {
        const { q, serialNumber } = req.query;

        try {
            let transactions;
            if (serialNumber) {
                transactions = await Transaction.findOne({ serialNumber: serialNumber.toUpperCase() });
                if (!transactions) {
                    return res.status(404).json({ success: false, transaction: null, error: 'Serial number not found.' });
                }
                return res.status(200).json({ success: true, transaction: transactions });
            }
            
            if (q) {
                const searchRegex = new RegExp(q, 'i');
                transactions = await Transaction.find({
                    $or: [
                        { productName: searchRegex },
                        { serialNumber: searchRegex },
                        { adminName: searchRegex },
                        { buyerNumber: searchRegex },
                    ]
                });
                return res.status(200).json({ success: true, transactions });
            }

            return res.status(400).json({ success: false, error: 'Query parameter is missing.' });

        } catch (error) {
            console.error('Error searching for transactions:', error);
            res.status(500).json({ success: false, error: 'An error occurred on the server.' });
        }
    } else {
        res.status(405).json({ success: false, error: 'Method not allowed.' });
    }
}