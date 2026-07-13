export function getWalletAppUrl(baseHost = '127.0.0.1') {
  return process.env.EXPO_PUBLIC_WALLET_URL || `http://${baseHost}:8082`;
}
