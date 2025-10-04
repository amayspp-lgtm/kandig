import { useState } from 'react';
import Head from 'next/head';

export default function HomePage() {
    const [serialNumber, setSerialNumber] = useState('');
    const [result, setResult] = useState(null);
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setResult(null);
        setMessage('Mengecek...');

        try {
            const res = await fetch(`/api/transactions?serialNumber=${serialNumber}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Terjadi kesalahan saat mengecek garansi.');
            }

            if (!data.transaction) {
                setMessage('Nomor seri tidak ditemukan.');
                setResult(null);
            } else {
                setMessage('Status garansi ditemukan.');
                setResult(data.transaction);
            }
        } catch (error) {
            setMessage(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const displayResult = () => {
        if (!result) return null;

        const purchaseDate = new Date(result.purchaseDate);
        const expiryDate = new Date(result.warrantyExpiryDate);
        const today = new Date();
        const isExpired = today > expiryDate;
        const remainingDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        return (
            <div className="result-card">
                <h2><i className="fas fa-info-circle"></i> Detail Garansi</h2>
                <p><strong>Kode Transaksi:</strong> {result.transactionCode}</p>
                <p><strong>Nama Produk:</strong> {result.productName}</p>
                <p><strong>Harga:</strong> Rp{result.productPrice.toLocaleString('id-ID')}</p>
                <p><strong>Admin:</strong> {result.adminName}</p>
                <p><strong>Nomor Pembeli:</strong> {result.buyerNumber}</p>
                <p><strong>Nomor Seri:</strong> {result.serialNumber}</p>
                <p><strong>Tanggal Pembelian:</strong> {purchaseDate.toLocaleDateString('id-ID')}</p>
                <p><strong>Masa Garansi:</strong> {result.warrantyDuration} {result.warrantyUnit}</p>
                <p><strong>Garansi Berakhir:</strong> {expiryDate.toLocaleDateString('id-ID')}</p>
                <p><strong>Status:</strong> 
                    <span className={`status-indicator ${isExpired ? 'expired' : 'active'}`}>
                        <i className={`fas fa-${isExpired ? 'exclamation-circle' : 'check-circle'}`}></i>
                        {isExpired ? 'Kedaluwarsa' : ` Masih berlaku, sisa ${remainingDays} hari`}
                    </span>
                </p>
            </div>
        );
    };

    return (
        <div className="container">
            <Head>
                <title>Cek Garansi Produk</title>
            </Head>
            <h1><i className="fas fa-shield-alt"></i> Cek Status Garansi</h1>
            <form onSubmit={handleSubmit} className="form">
                <div className="form-group">
                    <label htmlFor="serialNumber"><i className="fas fa-barcode"></i> Masukkan Nomor Seri Produk</label>
                    <input type="text" id="serialNumber" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} required placeholder="Contoh: SN123456789" />
                </div>
                <button type="submit" disabled={isLoading}><i className={`fas fa-${isLoading ? 'circle-notch fa-spin' : 'search'}`}></i> Cek Garansi</button>
            </form>
            {message && <p className="message">{message}</p>}
            {displayResult()}
            <div className="footer-nav">
                <a href="/login"><i className="fas fa-users-cog"></i> Ke Halaman Admin</a>
            </div>
        </div>
    );
}