import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function AdminPage() {
    const [isAuth, setIsAuth] = useState(false);
    const [currentMenu, setCurrentMenu] = useState('record'); // 'record' or 'list'
    const [formData, setFormData] = useState({
        productName: '', productPrice: '', adminName: '', buyerNumber: '',
        activeDuration: '', activeUnit: 'days', hasActivePeriod: false,
        warrantyDuration: '', warrantyUnit: 'months', hasWarranty: false
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
    const handleCheckboxChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.checked });

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('Menyimpan data...');
        
        try {
            const payload = {
                ...formData,
                productPrice: parseInt(formData.productPrice),
                activeDuration: formData.hasActivePeriod ? parseInt(formData.activeDuration) : null,
                warrantyDuration: formData.hasWarranty ? parseInt(formData.warrantyDuration) : null,
            };

            const res = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
    
            if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan saat menyimpan data.');
    
            setMessage(`Transaksi berhasil disimpan! Kode: ${data.data.transactionCode}`);
            setFormData({ 
                productName: '', productPrice: '', adminName: '', buyerNumber: '',
                activeDuration: '', activeUnit: 'days', hasActivePeriod: false,
                warrantyDuration: '', warrantyUnit: 'months', hasWarranty: false
            });
        } catch (error) {
            setMessage(error.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSearch = async () => {
        if (!searchQuery) {
            setMessage('Kolom pencarian tidak boleh kosong.');
            return;
        }
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
            </Head>

            <div className="admin-menu">
                <button onClick={() => setCurrentMenu('record')} className={currentMenu === 'record' ? 'active' : ''}>
                    <i className="fas fa-plus-circle"></i> Catat Transaksi
                </button>
                <button onClick={() => setCurrentMenu('list')} className={currentMenu === 'list' ? 'active' : ''}>
                    <i className="fas fa-list-ul"></i> Daftar Transaksi
                </button>
            </div>

            {currentMenu === 'record' && (
                <>
                    <h1><i className="fas fa-plus-circle"></i> Tambah Transaksi Baru</h1>
                    <form onSubmit={handleFormSubmit} className="form">
                        <div className="form-group">
                            <label htmlFor="productName"><i className="fas fa-box"></i> Nama Produk</label>
                            <input type="text" id="productName" name="productName" value={formData.productName} onChange={handleChange} required placeholder="Contoh: Akun Server Game" />
                        </div>
                        <div className="form-group">
                            <label htmlFor="productPrice"><i className="fas fa-dollar-sign"></i> Harga Produk (Rp)</label>
                            <input type="number" id="productPrice" name="productPrice" value={formData.productPrice} onChange={handleChange} required placeholder="Contoh: 50000" />
                        </div>
                        <div className="form-group">
                            <label htmlFor="adminName"><i className="fas fa-user-shield"></i> Admin Pengurus</label>
                            <input type="text" id="adminName" name="adminName" value={formData.adminName} onChange={handleChange} required placeholder="Contoh: Admin Budi" />
                        </div>
                        <div className="form-group">
                            <label htmlFor="buyerNumber"><i className="fas fa-phone-alt"></i> Nomor Pembeli</label>
                            <input type="text" id="buyerNumber" name="buyerNumber" value={formData.buyerNumber} onChange={handleChange} required placeholder="Contoh: 08123456789" />
                        </div>

                        <div className="checkbox-options">
                            <div className="option-group">
                                <input type="checkbox" id="hasActivePeriod" name="hasActivePeriod" checked={formData.hasActivePeriod} onChange={handleCheckboxChange} />
                                <label htmlFor="hasActivePeriod">Tambahkan Masa Aktif</label>
                            </div>
                            <div className="option-group">
                                <input type="checkbox" id="hasWarranty" name="hasWarranty" checked={formData.hasWarranty} onChange={handleCheckboxChange} />
                                <label htmlFor="hasWarranty">Tambahkan Garansi</label>
                            </div>
                        </div>

                        {formData.hasActivePeriod && (
                            <div className="form-group">
                                <label><i className="fas fa-clock"></i> Masa Aktif</label>
                                <div className="duration-input">
                                    <input type="number" id="activeDuration" name="activeDuration" value={formData.activeDuration} onChange={handleChange} required placeholder="Durasi" />
                                    <select id="activeUnit" name="activeUnit" value={formData.activeUnit} onChange={handleChange}>
                                        <option value="days">Hari</option>
                                        <option value="weeks">Minggu</option>
                                        <option value="months">Bulan</option>
                                    </select>
                                </div>
                            </div>
                        )}
                        
                        {formData.hasWarranty && (
                            <div className="form-group">
                                <label><i className="fas fa-shield-alt"></i> Masa Garansi</label>
                                <div className="duration-input">
                                    <input type="number" id="warrantyDuration" name="warrantyDuration" value={formData.warrantyDuration} onChange={handleChange} required placeholder="Durasi" />
                                    <select id="warrantyUnit" name="warrantyUnit" value={formData.warrantyUnit} onChange={handleChange}>
                                        <option value="days">Hari</option>
                                        <option value="weeks">Minggu</option>
                                        <option value="months">Bulan</option>
                                    </select>
                                </div>
                            </div>
                        )}
                        
                        <button type="submit" disabled={isLoading}><i className={`fas fa-${isLoading ? 'circle-notch fa-spin' : 'save'}`}></i> Simpan Transaksi</button>
                    </form>
                    {message && <p className="message">{message}</p>}
                </>
            )}

            {currentMenu === 'list' && (
                <>
                    <h2><i className="fas fa-list-ul"></i> Daftar Transaksi</h2>
                    <div className="search-section">
                        <input type="text" id="searchQuery" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari berdasarkan Kode, Produk, Admin, atau No. Pembeli" />
                        <button onClick={handleSearch} disabled={isLoading}><i className={`fas fa-${isLoading ? 'circle-notch fa-spin' : 'search'}`}></i> Cari</button>
                    </div>
                    {message && <p className="message">{message}</p>}
                    <div id="searchResults" className="results-container">
                        {searchResults.length > 0 ? searchResults.map(trans => (
                            <div key={trans._id} className="search-result-item">
                                <h3>{trans.productName}</h3>
                                <p><strong>Kode Transaksi:</strong> {trans.transactionCode}</p>
                                <p><strong>Harga:</strong> Rp{trans.productPrice.toLocaleString('id-ID')}</p>
                                <p><strong>Admin:</strong> {trans.adminName}</p>
                                <p><strong>Nomor Pembeli:</strong> {trans.buyerNumber}</p>
                                <p><strong>Tanggal Transaksi:</strong> {new Date(trans.createdAt).toLocaleDateString('id-ID')}</p>
                            </div>
                        )) : <p>Tidak ada hasil untuk ditampilkan.</p>}
                    </div>
                </>
            )}
            
            <div className="footer-nav">
                <a href="/"><i className="fas fa-home"></i> Ke Halaman Utama</a>
            </div>
        </div>
    );
}