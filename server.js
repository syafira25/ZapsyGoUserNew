const express = require('express');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');
const path = require('path');


const app = express();


// Middleware
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/adminpanel', express.static(path.join(__dirname, 'adminpanel')));
app.use('/public', express.static(path.join(__dirname, 'public')));


// Lokasi file JSON
const USERS_FILE = './users.json';
const ADMINS_FILE = './admins.json';
const PESANAN_FILE = './data/pesanan.json';
const DESTINASI_FILE = './destinasi.json';
const TRIP_FILE = './trips.json';
const BOOKING_PATH = "./kelola_booking.json";
const TRANSAKSI_PATH = "./kelola_transaksi.json";
const PAKET_FILE = "./kelola_paket.json";
const ITINERARY_FILE = './data/itinerary.json';


// Fungsi bantu
const loadJson = file => {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : []; // tambahkan validasi array
  } catch (err) {
    console.error(`❌ Gagal membaca ${file}:`, err.message);
    return [];
  }
};

const saveJson = (file, data) => {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`❌ Gagal menyimpan ${file}:`, err.message);
  }
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname); // ambil ekstensi, misalnya .jpg
    const filename = Date.now().toString(16) + ext; // nama unik + ekstensi
    cb(null, filename);
  },
});

const upload = multer({ storage });

// ===================== AUTH =====================
app.post("/api/register", upload.single("foto"), async (req, res) => {
  try {
    const { nama, email, password } = req.body;
    const username = email; // gunakan email sebagai username
    const users = loadJson(USERS_FILE);

    // Cek apakah email sudah digunakan
    if (users.find(user => user.email === email)) {
      return res.status(400).json({ message: "Email sudah digunakan" });
    }

    const bcrypt = require("bcrypt");
    const hashedPassword = await bcrypt.hash(password, 10);

    const fotoPath = req.file
      ? `/uploads/${req.file.filename}`
      : ""; // bisa diganti default image kalau mau

    const newUser = {
      id_user: "USR" + String(Date.now()).slice(-5),
      nama,
      email,
      username,
      password: hashedPassword,
      foto: fotoPath
    };

    users.push(newUser);
    saveJson(USERS_FILE, users);

    res.json({
      message: "Berhasil register",
      user: { ...newUser, password: "••••••••" }
    });
  } catch (err) {
    console.error("❌ Gagal register:", err.message);
    res.status(500).json({ message: "Terjadi kesalahan saat register" });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const users = loadJson(USERS_FILE);
  const user = users.find(u => u.email === email);

  if (!user) {
    return res.status(404).json({ message: "User tidak ditemukan" });
  }

  const bcrypt = require("bcrypt");
  const isMatch = await bcrypt.compare(password, user.password); // 🔐 Bandingkan hash

  if (!isMatch) {
    return res.status(401).json({ message: "Password salah" });
  }

  res.json({ message: "Login berhasil", user: { ...user, password: "••••••••" } });
});


app.post('/api/admin-login', (req, res) => {
  const { username, password } = req.body;
  const admins = loadJson(ADMINS_FILE);
  if (!admins.find(a => a.username === username && a.password === password))
    return res.status(401).json({ message: 'Login admin gagal' });
  res.json({ message: 'Login admin berhasil' });
});

app.post('/api/admin_register', (req, res) => {
  const { username, password } = req.body;
  const admins = loadJson(ADMINS_FILE);
  if (admins.find(a => a.username === username))
    return res.status(400).json({ message: 'Username admin sudah digunakan' });
  admins.push({ username, password });
  saveJson(ADMINS_FILE, admins);
  res.status(201).json({ message: 'Admin berhasil didaftarkan' });
});

// ===================== PROFILE =====================
app.get('/api/profile', (req, res) => {
  const username = req.query.username;
  if (!username) return res.status(400).json({ message: 'Username diperlukan' });

  const users = loadJson(USERS_FILE);
  const user = users.find(u => u.username === username);
  if (!user) return res.status(404).json({ message: 'Pengguna tidak ditemukan' });

  // Sesuaikan field dengan yang dibaca frontend
  res.json({
    username: user.username,
    nama: user.nama,
    photo: user.foto || "",       // frontend pakai "photo", bukan "foto"
    phone: user.phone || "",
    alamat: user.alamat || "",
    lahir: user.lahir || "",
    gender: user.gender || ""
  });
});

app.post('/api/update-profile', upload.single("foto"), (req, res) => {
  const { email, phone, alamat, lahir, gender } = req.body;
  

  if (!email) {
    return res.status(400).json({ message: 'Email wajib dikirim untuk update profile' });
  }

  const users = loadJson(USERS_FILE);
  const idx = users.findIndex(u => u.email === email);

  if (idx === -1) {
    return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
  }

  // Update foto jika ada
  if (req.file) {
    users[idx].foto = `/uploads/${req.file.filename}`;
  }

  // Update data lainnya
  users[idx].phone = phone || users[idx].phone;
  users[idx].alamat = alamat || users[idx].alamat;
  users[idx].lahir = lahir || users[idx].lahir;
  users[idx].gender = gender || users[idx].gender;

  saveJson(USERS_FILE, users);
  res.json({ message: '✅ Profil berhasil diperbarui' });
});



// ===================== DESTINASI =====================
app.get('/api/destinasi', (req, res) => res.json(loadJson(DESTINASI_FILE)));

app.post('/api/destinasi', (req, res) => {
  const arr = loadJson(DESTINASI_FILE);
  arr.push(req.body);
  saveJson(DESTINASI_FILE, arr);
  res.status(201).json({ message: 'Destinasi berhasil ditambahkan' });
});

app.delete('/api/destinasi/:index', (req, res) => {
  const idx = parseInt(req.params.index);
  const arr = loadJson(DESTINASI_FILE);
  if (idx < 0 || idx >= arr.length)
    return res.status(400).json({ message: 'Index tidak valid' });
  arr.splice(idx, 1);
  saveJson(DESTINASI_FILE, arr);
  res.json({ message: 'Destinasi berhasil dihapus' });
});

app.post('/api/destinasi-upload', upload.single('foto'), (req, res) => {
  const arr = loadJson(DESTINASI_FILE);
  const { nama, lokasi, deskripsi } = req.body;
  const foto = req.file ? `/uploads/${req.file.filename}` : 'https://via.placeholder.com/60';
  arr.push({ nama, lokasi, deskripsi, foto });
  saveJson(DESTINASI_FILE, arr);
  res.status(201).json({ message: 'Destinasi berhasil ditambahkan' });
});

// ===================== TRIPS =====================
app.get('/api/trips', (req, res) => {
  res.json(loadJson(TRIP_FILE));
});

app.post('/api/trips', upload.single("gambar"), (req, res) => {
  const trips = loadJson(TRIP_FILE);
  const { id, name, durasi, desc, price } = req.body;

  if (trips.some(t => t.id === id)) {
    return res.status(400).json({ message: 'Trip ID sudah ada' });
  }

  const gambar = req.file ? `/uploads/${req.file.filename}` : "";

  const newTrip = { id, name, durasi, desc, price, gambar };
  trips.push(newTrip);
  saveJson(TRIP_FILE, trips);
  res.status(201).json({ message: 'Trip berhasil ditambahkan' });
});

app.put('/api/trips/:id', (req, res) => {
  const trips = loadJson(TRIP_FILE);
  const idx = trips.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Trip tidak ditemukan' });
  trips[idx] = { ...trips[idx], ...req.body };
  saveJson(TRIP_FILE, trips);
  res.json({ message: 'Trip berhasil diperbarui' });
});

app.delete('/api/trips/:id', (req, res) => {
  const trips = loadJson(TRIP_FILE);
  const idx = trips.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Trip tidak ditemukan' });
  trips.splice(idx, 1);
  saveJson(TRIP_FILE, trips);
  res.json({ message: 'Trip berhasil dihapus' });
});

// ===================== PEMESANAN & TRANSAKSI =====================
app.post("/api/pemesanan", (req, res) => {
  const {
    username,
    nama_paket,
    tanggal_pemesanan,
    jumlah_orang,
    total_tagihan,
    metode_pembayaran,
    harga_per_orang // <- jika frontend kirim ini, akan dihitung otomatis
  } = req.body;

  const timestamp = Date.now();
  const id_booking = `BK${timestamp}`;
  const id_transaksi = `TRX${timestamp}`;

  const jml_orang = parseInt(jumlah_orang) || 1;
  const harga_per = parseInt(harga_per_orang) || 300000;

  const total = parseInt(total_tagihan) || jml_orang * harga_per;

const newBooking = {
  id_booking,
  username,
  nama_paket, // ✅ Tambahkan ini
  tanggal_pemesanan: tanggal_pemesanan || new Date().toISOString(),
  jumlah_orang: jml_orang,
  harga_total: total,
  status: "Menunggu Pembayaran"
};

const newTransaksi = {
  id_transaksi,
  id_booking,
  nama_pengirim: username,
  nama_paket, // ✅ Tambahkan juga
  metode_pembayaran,
  jumlah_transfer: total,
  bukti_transfer: null,
  tanggal_transfer: new Date().toISOString(),
  status_verifikasi: "Menunggu Verifikasi"
};


  const bookings = loadJson(BOOKING_PATH);
  bookings.push(newBooking);
  saveJson(BOOKING_PATH, bookings);

  const transaksi = loadJson(TRANSAKSI_PATH);
  transaksi.push(newTransaksi);
  saveJson(TRANSAKSI_PATH, transaksi);

  res.json({
    message: "✅ Transaksi berhasil disimpan",
    booking: newBooking,
    transaksi: newTransaksi
  });
});

app.post("/api/upload-bukti/:id_transaksi", upload.single("bukti"), (req, res) => {
  const { id_transaksi } = req.params;
  const transaksiData = loadJson(TRANSAKSI_PATH);
  const transaksi = transaksiData.find(t => t.id_transaksi === id_transaksi);

  if (!transaksi) return res.status(404).json({ error: "Transaksi tidak ditemukan" });

  // Tambahkan jika pengguna kirim nama_pengirim lewat body
  if (req.body.nama_pengirim) {
    transaksi.nama_pengirim = req.body.nama_pengirim;
  }

  transaksi.bukti_transfer = `/uploads/${req.file.filename}`;
  transaksi.status_verifikasi = "Menunggu Verifikasi";
  saveJson(TRANSAKSI_PATH, transaksiData);

  res.json({ success: true, file: req.file.filename });
});

app.post("/api/update_transaksi_status", (req, res) => {
  const { id_transaksi, status_verifikasi } = req.body;

  const transaksi = loadJson(TRANSAKSI_PATH);
  const index = transaksi.findIndex(t => t.id_transaksi === id_transaksi);

  if (index !== -1) {
    transaksi[index].status_verifikasi = status_verifikasi;
    saveJson(TRANSAKSI_PATH, transaksi);

    const id_booking = transaksi[index].id_booking;
    const bookings = loadJson(BOOKING_PATH);
    const bookingIndex = bookings.findIndex(b => b.id_booking === id_booking);
    if (bookingIndex !== -1) {
      bookings[bookingIndex].status =
        status_verifikasi === "Selesai"
          ? "Diterima"
          : status_verifikasi; // ✅ Tambahan perbaikan
      saveJson(BOOKING_PATH, bookings);
    }

    // ✅ Tambahkan success: true
    return res.json({
      success: true,
      message: "Status transaksi & booking diperbarui"
    });
  } else {
    return res.status(404).json({ message: "Transaksi tidak ditemukan" });
  }
});

// ===================== GET DATA =====================
app.get("/api/transaksi", (req, res) => {
  const transaksiData = loadJson(TRANSAKSI_PATH);
  res.json(transaksiData);
});

app.get("/api/bookings", (req, res) => {
  const data = loadJson(BOOKING_PATH);
  res.json(data);
});

app.delete("/api/hapus_transaksi/:id", (req, res) => {
  const id = req.params.id;
  const transaksi = loadJson(TRANSAKSI_PATH);
  const index = transaksi.findIndex(t => t.id_transaksi === id);
  if (index !== -1) {
    transaksi.splice(index, 1);
    saveJson(TRANSAKSI_PATH, transaksi);
    res.json({ message: "Transaksi dihapus" });
  } else {
    res.status(404).json({ message: "Transaksi tidak ditemukan" });
  }
});

// ===================== GET TRANSAKSI TERBARU =====================
app.get("/api/transaksi/latest", (req, res) => {
  const transaksi = loadJson(TRANSAKSI_PATH);
  if (transaksi.length === 0) return res.status(404).json({ message: "Tidak ada transaksi" });

  const last = transaksi[transaksi.length - 1];
  const totalTagihan = `Rp ${parseInt(last.jumlah_transfer).toLocaleString("id-ID")}`;

  res.json({
    id_transaksi: last.id_transaksi,
    virtual_account: "80777089237889088", // bisa disesuaikan per user
    total_tagihan: totalTagihan
  });
});

app.post("/api/paket", (req, res) => {
  const data = loadJson(PAKET_FILE);
  const newPaket = req.body;

  if (!newPaket.id_paket || !newPaket.nama_paket || !newPaket.harga) {
    return res.status(400).json({ message: "Data paket tidak lengkap" });
  }

  data.push(newPaket);
  saveJson(PAKET_FILE, data);
  res.status(201).json({ message: "Paket berhasil ditambahkan" });
});
// DELETE /api/delete_booking
app.delete("/api/delete_booking", (req, res) => {
  const { id_booking } = req.body;
  const bookings = loadJson(BOOKING_PATH);
  const filtered = bookings.filter(b => b.id_booking !== id_booking);

  if (filtered.length === bookings.length) {
    return res.status(404).json({ success: false, message: "Booking tidak ditemukan" });
  }

  saveJson(BOOKING_PATH, filtered);
  res.json({ success: true, message: "Booking berhasil dihapus" });
});
// GET semua users
app.get('/api/users', (req, res) => {
  const users = loadJson(USERS_FILE);  // ← Ganti dari 'path_ke_file_users.json'
  res.json(users);
});

// DELETE user by ID
app.delete('/api/delete_user', (req, res) => {
  const { id_user } = req.body;
  let users = loadJson(USERS_FILE); // ← Ganti dari 'path_ke_file_users.json'
  const originalLength = users.length;

  users = users.filter(u => u.id_user !== id_user);
  if (users.length === originalLength) {
    return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
  }

  saveJson(USERS_FILE, users);
  res.json({ success: true, message: 'User berhasil dihapus' });
});
// GET semua itinerary
app.get("/api/itinerary", (req, res) => {
  const data = loadJson(ITINERARY_FILE);
  res.json(data);
});

// Tambah itinerary
app.post("/api/itinerary-upload", upload.single("foto"), (req, res) => {
  const data = loadJson(ITINERARY_FILE);
  const { id, name, durasi, desc, price } = req.body;
  const foto = req.file ? `/uploads/${req.file.filename}` : "";

  if (!id || !name || !durasi || !price) {
    return res.status(400).json({ message: "Data tidak lengkap" });
  }

  data.push({ id, name, durasi, desc, price, foto });
  saveJson(ITINERARY_FILE, data);
  res.status(201).json({ message: "Itinerary berhasil ditambahkan" });
});

app.put("/api/itinerary/:id", upload.single("foto"), (req, res) => {
  const data = loadJson(ITINERARY_FILE);
  const idx = data.findIndex(item => item.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ message: "Itinerary tidak ditemukan" });
  }

  const { name, durasi, desc, price } = req.body;

  // Pakai gambar lama jika user tidak upload gambar baru
  const fotoBaru = req.file ? `/uploads/${req.file.filename}` : data[idx].foto;

  data[idx] = {
    ...data[idx],
    name: name || data[idx].name,
    durasi: durasi || data[idx].durasi,
    desc: desc || data[idx].desc,
    price: price || data[idx].price,
    foto: fotoBaru
  };

  saveJson(ITINERARY_FILE, data);
  res.json({ message: "Itinerary berhasil diperbarui" });
});

// Hapus itinerary
app.delete("/api/itinerary/:id", (req, res) => {
  let data = loadJson(ITINERARY_FILE);
  const idx = data.findIndex(item => item.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ message: "Itinerary tidak ditemukan" });
  }

  data.splice(idx, 1);
  saveJson(ITINERARY_FILE, data);
  res.json({ message: "Itinerary berhasil dihapus" });
});
// Edit trip + upload gambar (form multipart)
app.put("/api/trips-upload/:id", upload.single("gambar"), (req, res) => {
  const trips = loadJson(TRIP_FILE);
  const idx = trips.findIndex(t => t.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ message: "Trip tidak ditemukan" });
  }

  const trip = trips[idx];
  const { name, durasi, desc, price } = req.body;

  trips[idx] = {
    ...trip,
    name: name || trip.name,
    durasi: durasi || trip.durasi,
    desc: desc || trip.desc,
    price: price || trip.price,
    gambar: req.file ? `/uploads/${req.file.filename}` : trip.gambar
  };

  saveJson(TRIP_FILE, trips);
  res.json({ message: "Trip berhasil diperbarui (dengan gambar)" });
});

// ===================== START SERVER =====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server berjalan di http://localhost:${PORT}`);
});
