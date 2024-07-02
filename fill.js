
const fs = require('fs');
const contractName = 'Magang';
const filePath = `build/contracts/${contractName}.json`;
// Baca isi file build
const buildData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Ekstrak ABI, alamat kontrak, dan bytecode
const abi = JSON.stringify(buildData.abi);
const address = buildData.networks[5777].address;
const bytecode = buildData.bytecode;

// Tulis informasi ke dalam file yang sudah ada
fs.writeFileSync('./scm_address.bin', address);
fs.writeFileSync('./scm.json', abi);
fs.writeFileSync('./scm.bin', bytecode);
