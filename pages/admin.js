import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function AdminPage() {
    const [isAuth, setIsAuth] = useState(false);
    const [formData, setFormData] = useState({
        productName: '', productPrice: '', adminName: '', buyerNumber: '', serialNumber: '', purchaseDate: '', warrantyDuration: '', warrantyUnit: 'months'
    });
    const [message, setMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const checkSession = async () => {
            try {
                const res = await fetch('/api/check_session');
                if (res.ok) {
                    setIsAuth(true);
                } else {
                    window.location.href = '/login';
                }
            } catch (error) {
                window.location.href = '/login';
            }
        };
        checkSession();
    }, []);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('Menyimpan data...');
        
        try {
            const res = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
    
            if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan saat menyimpan data.');
    
            setMessage(`Transaksi berhasil disimpan! Kode: ${data.data.transactionCode}`);
            setFormData({ productName: '', productPrice: '', adminName: '', buyerNumber: '', serialNumber: '', purchaseDate: '', warrantyDuration: '', warrantyUnit: 'months' });
        } catch (error) {
            setMessage(error.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSearch = async () => {
        if (!searchQuery) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/transactions?q=${searchQuery}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan saat mencari.');
            setSearchResults(data.transactions);
            setMessage(`Ditemukan ${data.transactions.length} hasil.`);
        } catch (error) {
            setMessage(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isAuth) {
        return <div className="container">Memuat...</div>;
    }

    return (
        <div className="container">
            <Head>
                <title>Halaman Admin</title>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />
            </Head>
            <h1><i className="fas fa-plus-circle"></i> Tambah Transaksi Baru</h1>
            <form onSubmit={handleFormSubmit} className="form">
                <div className="form-group">
                    <label htmlFor="productName"><i className="fas fa-box"></i> Nama Produk</label>
                    <input type="text" id="productName" name="productName" value={formData.productName} onChange={handleChange} required placeholder="Contoh: Laptop Gaming X1" />
                </div>
                <div className="form-group">
                    <label htmlFor="productPrice"><i className="fas fa-dollar-sign"></i> Harga Produk (Rp)</label>
                    <input type="number" id="productPrice" name="productPrice" value={formData.productPrice} onChange={handleChange} required placeholder="Contoh: 15000000" />
                </div>
                <div className="form-group">
                    <label htmlFor="adminName"><i className="fas fa-user-shield"></i> Admin Pengurus</label>
                    <input type="text" id="adminName" name="adminName" value={formData.adminName} onChange={handleChange} required placeholder="Contoh: Admin Budi" />
                </div>
                <div className="form-group">
                    <label htmlFor="buyerNumber"><i className="fas fa-phone-alt"></i> Nomor Pembeli</label>
                    <input type="text" id="buyerNumber" name="buyerNumber" value={formData.buyerNumber} onChange={handleChange} required placeholder="Contoh: 08123456789" />
                </div>
                <div className="form-group">
                    <label htmlFor="serialNumber"><i className="fas fa-barcode"></i> Nomor Seri</label>
                    <input type="text" id="serialNumber" name="serialNumber" value={formData.serialNumber} onChange={handleChange} required placeholder="Contoh: SN123456789" />
                </div>
                <div className="form-group">
                    <label htmlFor="purchaseDate"><i className="fas fa-calendar-alt"></i> Tanggal Pembelian</label>
                    <input type="date" id="purchaseDate" name="purchaseDate" value={formData.purchaseDate} onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label><i className="fas fa-calendar-check"></i> Masa Garansi</label>
                    <div className="warranty-options">
                        <input type="number" id="warrantyDuration" name="warrantyDuration" value={formData.warrantyDuration} onChange={handleChange} required placeholder="Durasi" />
                        <select id="warrantyUnit" name="warrantyUnit" value={formData.warrantyUnit} onChange={handleChange}>
                            <option value="days">Hari</option>
                            <option value="weeks">Minggu</option>
                            <option value="months">Bulan</option>
                        </select>
                    </div>
                </div>
                <button type="submit" disabled={isLoading}><i className={`fas fa-${isLoading ? 'circle-notch fa-spin' : 'save'}`}></i> Simpan Transaksi</button>
            </form>
            {message && <p className="message">{message}</p>}

            <hr />

            <h2><i className="fas fa-search"></i> Cari Transaksi</h2>
            <div className="search-section">
                <input type="text" id="searchQuery" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari berdasarkan No. Seri, Produk, Admin, atau No. Pembeli" />
                <button onClick={handleSearch}><i className={`fas fa-${isLoading ? 'circle-notch fa-spin' : 'search'}`}></i> Cari</button>
            </div>
            <div id="searchResults" className="results-container">
                {searchResults.map(trans => (
                    <div key={trans._id} className="search-result-item">
                        <h3>{trans.productName}</h3>
                        <p><strong>Kode Transaksi:</strong> {trans.transactionCode}</p>
                        <p><strong>Nomor Seri:</strong> {trans.serialNumber}</p>
                        <p><strong>Admin:</strong> {trans.adminName}</p>
                        <p><strong>Nomor Pembeli:</strong> {trans.buyerNumber}</p>
                        <p><strong>Tanggal Pembelian:</strong> {new Date(trans.purchaseDate).toLocaleDateString('id-ID')}</p>
                    </div>
                ))}
            </div>
            
            <div className="footer-nav">
                <a href="/"><i className="fas fa-home"></i> Ke Halaman Utama</a>
            </div>
        </div>
    );
}