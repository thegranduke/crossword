const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('tflite');

const tfliteRoot = path.resolve(__dirname, 'node_modules/@tensorflow/tfjs-tflite');
const tfliteWebApiClient = path.join(tfliteRoot, 'wasm/tflite_web_api_client.js');

const resolveRequestWithContext = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Package ships tflite_web_api_client only under wasm/, not dist/.
  if (
    moduleName === './tflite_web_api_client' ||
    moduleName === '../tflite_web_api_client' ||
    moduleName.endsWith('tflite_web_api_client')
  ) {
    return { type: 'sourceFile', filePath: tfliteWebApiClient };
  }

  // Avoid Node build (uses `self` / document) when bundling for web.
  if (platform === 'web' && moduleName === '@tensorflow/tfjs-tflite') {
    return {
      type: 'sourceFile',
      filePath: path.join(tfliteRoot, 'dist/tflite_model.js'),
    };
  }

  if (resolveRequestWithContext) {
    return resolveRequestWithContext(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
