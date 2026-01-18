// All 75 districts of Nepal with their approximate coordinates
const NEPAL_DISTRICTS = [
  // Province 1 (Koshi Pradesh)
  { name: 'Bhojpur', latitude: 27.1667, longitude: 87.0500 },
  { name: 'Dhankuta', latitude: 26.9833, longitude: 87.3333 },
  { name: 'Ilam', latitude: 26.9089, longitude: 87.9286 },
  { name: 'Jhapa', latitude: 26.3467, longitude: 87.8167 },
  { name: 'Khotang', latitude: 27.0333, longitude: 86.8167 },
  { name: 'Morang', latitude: 26.6500, longitude: 87.2833 },
  { name: 'Okhaldhunga', latitude: 27.3167, longitude: 86.5000 },
  { name: 'Panchthar', latitude: 27.1333, longitude: 87.8667 },
  { name: 'Sankhuwasabha', latitude: 27.4333, longitude: 87.1833 },
  { name: 'Solukhumbu', latitude: 27.6833, longitude: 86.7333 },
  { name: 'Sunsari', latitude: 26.6167, longitude: 87.1833 },
  { name: 'Taplejung', latitude: 27.3500, longitude: 87.6667 },
  { name: 'Terhathum', latitude: 27.1167, longitude: 87.5667 },
  { name: 'Udayapur', latitude: 26.8500, longitude: 86.7333 },

  // Province 2 (Madhesh Pradesh)
  { name: 'Bara', latitude: 27.0000, longitude: 84.9333 },
  { name: 'Dhanusha', latitude: 26.7500, longitude: 85.9667 },
  { name: 'Mahottari', latitude: 26.8667, longitude: 85.7500 },
  { name: 'Parsa', latitude: 27.0500, longitude: 84.9167 },
  { name: 'Rautahat', latitude: 27.0000, longitude: 85.2833 },
  { name: 'Saptari', latitude: 26.7333, longitude: 86.7167 },
  { name: 'Sarlahi', latitude: 26.9833, longitude: 85.5500 },
  { name: 'Siraha', latitude: 26.6500, longitude: 86.2000 },

  // Bagmati Pradesh
  { name: 'Bhaktapur', latitude: 27.6710, longitude: 85.4298 },
  { name: 'Chitwan', latitude: 27.5291, longitude: 84.3542 },
  { name: 'Dhading', latitude: 27.8667, longitude: 84.9000 },
  { name: 'Dolakha', latitude: 27.6833, longitude: 86.1667 },
  { name: 'Kathmandu', latitude: 27.7172, longitude: 85.3240 },
  { name: 'Kavrepalanchok', latitude: 27.5500, longitude: 85.5667 },
  { name: 'Lalitpur', latitude: 27.6667, longitude: 85.3167 },
  { name: 'Makwanpur', latitude: 27.4333, longitude: 85.0333 },
  { name: 'Nuwakot', latitude: 27.9167, longitude: 85.1667 },
  { name: 'Ramechhap', latitude: 27.3333, longitude: 86.0833 },
  { name: 'Rasuwa', latitude: 28.1667, longitude: 85.3333 },
  { name: 'Sindhuli', latitude: 27.2500, longitude: 85.9667 },
  { name: 'Sindhupalchok', latitude: 27.9500, longitude: 85.6833 },

  // Gandaki Pradesh
  { name: 'Baglung', latitude: 28.2667, longitude: 83.5833 },
  { name: 'Gorkha', latitude: 28.0000, longitude: 84.6333 },
  { name: 'Kaski', latitude: 28.2096, longitude: 83.9856 },
  { name: 'Lamjung', latitude: 28.2333, longitude: 84.3833 },
  { name: 'Manang', latitude: 28.6667, longitude: 84.0167 },
  { name: 'Mustang', latitude: 28.9833, longitude: 83.8833 },
  { name: 'Myagdi', latitude: 28.6000, longitude: 83.3667 },
  { name: 'Nawalpur', latitude: 27.7167, longitude: 84.1167 },
  { name: 'Parbat', latitude: 28.2167, longitude: 83.6833 },
  { name: 'Syangja', latitude: 28.0833, longitude: 83.8667 },
  { name: 'Tanahun', latitude: 27.9167, longitude: 84.2333 },

  // Lumbini Pradesh
  { name: 'Arghakhanchi', latitude: 28.0000, longitude: 83.1000 },
  { name: 'Banke', latitude: 28.0500, longitude: 81.6167 },
  { name: 'Bardiya', latitude: 28.3333, longitude: 81.3500 },
  { name: 'Dang', latitude: 28.0833, longitude: 82.3000 },
  { name: 'Gulmi', latitude: 28.0833, longitude: 83.2833 },
  { name: 'Kapilvastu', latitude: 27.5667, longitude: 83.0500 },
  { name: 'Nawalparasi East', latitude: 27.6333, longitude: 84.0833 },
  { name: 'Nawalparasi West', latitude: 27.6333, longitude: 83.4500 },
  { name: 'Palpa', latitude: 27.8667, longitude: 83.5500 },
  { name: 'Pyuthan', latitude: 28.0833, longitude: 82.8333 },
  { name: 'Rolpa', latitude: 28.2667, longitude: 82.6333 },
  { name: 'Rupandehi', latitude: 27.5000, longitude: 83.4667 },

  // Karnali Pradesh
  { name: 'Dailekh', latitude: 28.8500, longitude: 81.7167 },
  { name: 'Dolpa', latitude: 28.9833, longitude: 82.8167 },
  { name: 'Humla', latitude: 29.6667, longitude: 81.8333 },
  { name: 'Jajarkot', latitude: 28.7000, longitude: 82.1833 },
  { name: 'Jumla', latitude: 29.2744, longitude: 82.1833 },
  { name: 'Kalikot', latitude: 29.1333, longitude: 81.7333 },
  { name: 'Mugu', latitude: 29.6667, longitude: 82.1667 },
  { name: 'Salyan', latitude: 28.3667, longitude: 82.1667 },
  { name: 'Surkhet', latitude: 28.6000, longitude: 81.6333 },
  { name: 'Western Rukum', latitude: 28.5833, longitude: 82.5667 },

  // Sudurpashchim Pradesh
  { name: 'Achham', latitude: 29.0833, longitude: 81.2333 },
  { name: 'Baitadi', latitude: 29.5333, longitude: 80.5500 },
  { name: 'Bajhang', latitude: 29.5333, longitude: 81.1833 },
  { name: 'Bajura', latitude: 29.5000, longitude: 81.6667 },
  { name: 'Dadeldhura', latitude: 29.3000, longitude: 80.5833 },
  { name: 'Darchula', latitude: 29.8500, longitude: 80.5500 },
  { name: 'Doti', latitude: 29.2667, longitude: 80.9833 },
  { name: 'Kailali', latitude: 28.7500, longitude: 80.9167 },
  { name: 'Kanchanpur', latitude: 28.8333, longitude: 80.2500 }
];

export { NEPAL_DISTRICTS };
