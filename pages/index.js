import { useState } from 'react';
import Head from 'next/head';

export default function HomePage() {
    const [transactionCode, setTransactionCode] = useState('');
    const [result, setResult] = useState(null);
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setResult(null);
        setMessage('Mengecek...');

        try {
            const res = await fetch(`/api/transactions?transactionCode=${transactionCode}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Terjadi kesalahan saat mengecek transaksi.');
            }

            if (!data.transaction) {
                setMessage('Kode transaksi tidak ditemukan.');
                setResult(null);
            } else {
                setMessage('Detail transaksi ditemukan.');
                setResult(data.transaction);
            }
        } catch (error) {
            setMessage(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatus = (expiryDate, label) => {
        if (!expiryDate) return null;
        const today = new Date();
        const expiry = new Date(expiryDate);
        if (today > expiry) {
            return { text: `${label} sudah kedaluwarsa.`, color: 'red', icon: 'exclamation-circle' };
        }
        const remainingDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        return { text: `${label} masih berlaku, sisa ${remainingDays} hari.`, color: 'green', icon: 'check-circle' };
    };

    const displayResult = () => {
        if (!result) return null;

        const activeStatus = getStatus(result.activeExpiryDate, 'Masa Aktif');
        const warrantyStatus = getStatus(result.warrantyExpiryDate, 'Garansi');
        
        return (
            <div className="result-card">
                <h2><i className="fas fa-info-circle"></i> Detail Transaksi</h2>
                <p><strong>Nama Produk:</strong> {result.productName}</p>
                <p><strong>Harga:</strong> Rp{result.productPrice.toLocaleString('id-ID')}</p>
                <p><strong>Kode Transaksi:</strong> {result.transactionCode}</p>
                <p><strong>Tanggal Pembelian:</strong> {new Date(result.createdAt).toLocaleDateString('id-ID')}</p>
                
                {result.hasActivePeriod && (
                    <>
                    <hr />
                    <p><strong>Masa Aktif:</strong> {result.activeDuration} {result.activeUnit}</p>
                    <p><strong>Status Masa Aktif:</strong> 
                        <span className={`status-indicator ${activeStatus.color === 'red' ? 'expired' : 'active'}`}>
                            <i className={`fas fa-${activeStatus.icon}`}></i> {activeStatus.text}
                        </span>
                    </p>
                    </>
                )}

                {result.hasWarranty && (
                    <>
                    <hr />
                    <p><strong>Masa Garansi:</strong> {result.warrantyDuration} {result.warrantyUnit}</p>
                    <p><strong>Status Garansi:</strong> 
                        <span className={`status-indicator ${warrantyStatus.color === 'red' ? 'expired' : 'active'}`}>
                            <i className={`fas fa-${warrantyStatus.icon}`}></i> {warrantyStatus.text}
                        </span>
                    </p>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="container">
            <Head>
                <title>Cek Transaksi</title>
            </Head>
            <h1><i className="fas fa-shield-alt"></i> Cek Transaksi</h1>
            <form onSubmit={handleSubmit} className="form">
                <div className="form-group">
                    <label htmlFor="transactionCode"><i className="fas fa-barcode"></i> Masukkan Kode Transaksi</label>
                    <input type="text" id="transactionCode" value={transactionCode} onChange={(e) => setTransactionCode(e.target.value)} required placeholder="Contoh: KNT-XY123AB" />
                </div>
                <button type="submit" disabled={isLoading}><i className={`fas fa-${isLoading ? 'circle-notch fa-spin' : 'search'}`}></i> Cek Transaksi</button>
            </form>
            {message && <p className="message">{message}</p>}
            {displayResult()}
            <div className="footer-nav">
                <a href="/login"><i className="fas fa-users-cog"></i> Ke Halaman Admin</a>
            </div>
        </div>
    );
}