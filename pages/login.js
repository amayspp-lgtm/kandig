import { useState } from 'react';
import Head from 'next/head';

export default function LoginPage() {
    const [adminKey, setAdminKey] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('Sedang memproses...');

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: adminKey }),
            });

            const data = await res.json();
            if (res.ok) {
                setMessage('Login berhasil! Mengalihkan...');
                window.location.href = '/admin';
            } else {
                throw new Error(data.error || 'Terjadi kesalahan saat login.');
            }
        } catch (error) {
            setMessage(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container login-form">
            <Head>
                <title>Login Admin</title>
            </Head>
            <h1><i className="fas fa-lock"></i> Login Admin</h1>
            <form onSubmit={handleSubmit} className="form">
                <div className="form-group">
                    <label htmlFor="adminKey"><i className="fas fa-key"></i> Masukkan Kunci Khusus</label>
                    <input type="password" id="adminKey" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} required />
                </div>
                <button type="submit" disabled={isLoading}><i className={`fas fa-${isLoading ? 'circle-notch fa-spin' : 'sign-in-alt'}`}></i> Login</button>
            </form>
            {message && <p className="message">{message}</p>}
        </div>
    );
}