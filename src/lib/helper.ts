export const getRoleColor = (role) => {
  switch (role) {
    case "petani":
      return "text-white bg-indigo-500";
    case "pengolah":
      return "text-white bg-green-500";
    case "pengekspor":
      return "text-white bg-yellow-500";
    case "importir":
      return "text-white bg-red-500";
    case "distributor":
      return "text-white bg-blue-500";
    case "retailer":
      return "text-white bg-purple-500";
    case "konsumen":
      return "text-white bg-gray-500";
    default:
      return "text-white bg-gray-300"; // Default color
  }
};

export const getStatusColor = (status) => {
  switch (status.toLowerCase()) {
    case "confirmed":
      return "text-white bg-green-500";
    case "sending":
      return "text-white bg-yellow-500";
    case "waiting to confirmation":
      return "text-white bg-yellow-500";
    case "deleted":
      return "text-white bg-red-500";
    default:
      return "text-white bg-gray-500"; // Default color
  }
};

export const camelToTitleCase = (camelCase) => {
  return camelCase
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());
};

export const addUnitIfKuantitas = (value, prop) => {
  if (typeof prop === "string" && prop.match(/kuantitas/i)) {
    return `${value} KG`;
  }
  return value;
};

export function formatRupiah(angka: any) {
  let reverse = angka.toString().split("").reverse().join("");
  let ribuan = reverse.match(/\d{1,3}/g);
  ribuan = ribuan?.join(".").split("").reverse().join("");
  return `Rp ${ribuan}`;
}

export const initialState = {
  rolePengirim: "",
  namaPetani: "John Doe",
  lokasiKebun: "Desa Sukamaju",
  jenisKopi: "Arabica",
  tanggalTanam: "2023-01-15",
  tanggalPanen: "2024-01-15",
  kuantasHasilPanen: 85,
  kondisiCuaca: "Cerah",
  catatanPerawatan: "Pemangkasan rutin setiap 3 bulan",
  //================//
  namaPengolah: "",
  metodePengolahan: "",
  tanggalPengolahan: "",
  kuantitasBijiKopiYangDiolah: 0,
  kualitasBijiKopi: "",
  catatanPengolahan: "",
  //================//
  namaPengekspor: "",
  negaraTujuan: "",
  kuantitasEkspor: 0,
  tanggalEkspor: "",
  nomorKontainerExpor: "",
  sertifikasiExpor: "",
  dokumenPendukungExport: "",
  //================//
  namaImportir: "",
  negaraAsal: "",
  kuantitasImpor: 0,
  tanggalImpor: "",
  nomorKontainerImpor: "",
  sertifikasiImpor: "",
  dokumenPendukungImpor: "",
  //================//
  namaDistributor: "",
  kuantitasDistribusi: 0,
  tanggalDistribusi: "",
  lokasiTujuan: "",
  kondisiPenyimpanan: "",
  catatanPengiriman: "",
  //================//
  namaRetailer: "",
  lokasiToko: "",
  jenisKopiYangDijual: "",
  kuantitasStok: 0,
  hargaJual: "",
  tanggalPenjualan: "",
  catatanPenjualan: "",
  //================//
  namaKonsumen: "",
  jenisKopiYangDibeli: "",
  tanggalPembelian: "",
  ulasanProduk: "",
};

export const groups = {
  PETANI: [
    "namaPetani",
    "lokasiKebun",
    "jenisKopi",
    "tanggalTanam",
    "tanggalPanen",
    "kuantasHasilPanen",
    "kondisiCuaca",
    "catatanPerawatan",
  ],
  PENGOLAH: [
    "namaPengolah",
    "metodePengolahan",
    "tanggalPengolahan",
    "kuantitasBijiKopiYangDiolah",
    "kualitasBijiKopi",
    "catatanPengolahan",
  ],
  PENGEKSPOR: [
    "namaPengekspor",
    "negaraTujuan",
    "kuantitasEkspor",
    "tanggalEkspor",
    "nomorKontainer",
    "sertifikasi",
    "dokumenPendukung",
  ],
  IMPORTIR: [
    "namaImportir",
    "negaraAsal",
    "kuantitasImpor",
    "tanggalImpor",
    "nomorKontainer",
    "sertifikasi",
    "dokumenPendukung",
  ],
  DISTRIBUTOR: [
    "namaDistributor",
    "kuantitasDistribusi",
    "tanggalDistribusi",
    "lokasiTujuan",
    "kondisiPenyimpanan",
    "catatanPengiriman",
  ],
  RETAILER: [
    "namaRetailer",
    "lokasiToko",
    "jenisKopiYangDijual",
    "kuantitasStok",
    "hargaJual",
    "tanggalPenjualan",
    "catatanPenjualan",
  ],
  KONSUMEN: [
    "namaKonsumen",
    "jenisKopiYangDibeli",
    "tanggalPembelian",
    "ulasanProduk",
  ],
};
