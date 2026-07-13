// Metro config — extends the default Expo config.
// Added for the buddy3d spike so Metro treats .glb as a bundled asset.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow importing .glb 3D models via require() as assets.
config.resolver.assetExts.push('glb');

module.exports = config;
