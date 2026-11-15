# TikTok Downloader (Neubrutalism Edition)

Web downloader video (MP4 HD tanpa watermark) dan audio (MP3) TikTok dengan antarmuka Neubrutalism murni (merujuk pada standard neubrutalism.com).

## Fitur Utama
1. **Multi-Fallback Scraper Pipeline**: Menggabungkan 4 engine scraper (`tikwm`, `ssstik`, `yupra`, `musicallydown`) untuk menjamin ketersediaan stream saat salah satu engine mengalami limitasi atau perubahan API.
2. **Server-Side Stream & Download Proxy**: Mengatasi pembatasan CORS dan token kedaluwarsa CDN TikTok dengan streaming proxy langsung via server lokal.
3. **Pratinjau Langsung**: Video player dan Audio player HTML5 sebelum mengunduh.
4. **Dukungan Slideshow / Carousel**: Mendukung unduhan kumpulan foto dan audio pengiring secara terpisah.
5. **Riwayat Unduhan**: Tersimpan otomatis di peramban lokal (`localStorage`).
6. **Desain Neubrutalism Asli**: Sudut kotak tegas (`border-radius: 0`), border tebal 3px, hard offset shadow tanpa blur, palet kontras tinggi WCAG AA. Bebas AI slop.

## Menjalankan Aplikasi
Pastikan Node.js (v18+) terpasang di komputer:

```bash
# Jalankan server
npm start
```

Buka peramban di:
`http://localhost:3000`

## Menjalankan Pengujian Otomatis
```bash
npm test
```
