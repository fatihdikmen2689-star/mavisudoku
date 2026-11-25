// Ortak sudoku motoru (paketler/motor) uygulama klasörünün dışında; Metro'nun onu izlemesi ve
// bağımlılıklarını bu uygulamanın node_modules klasöründen çözmesi için ayarlar.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const proje = __dirname;
const depo = path.resolve(proje, '../..');
const ayar = getDefaultConfig(proje);
ayar.watchFolders = [path.join(depo, 'paketler')];
ayar.resolver.nodeModulesPaths = [path.join(proje, 'node_modules')];
ayar.resolver.unstable_enableSymlinks = true;
module.exports = ayar;
