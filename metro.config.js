// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable web support
config.resolver.platforms = ['ios', 'android', 'web'];

// Handle SQLite web assets
config.resolver.assetExts.push('wasm');

module.exports = config;

