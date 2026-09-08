export type MoneyGateAction = 'kyc' | 'bank' | 'support' | null;

export type MoneyGateInfo = {
  code: string | null;
  title: string;
  body: string;
  action: MoneyGateAction;
};

/** Maps backend money-compliance codes to wallet UI copy. */
export function describeMoneyGateError(error: any): MoneyGateInfo {
  const code = String(error?.code || error?.payload?.code || '');
  const message = String(error?.message || error?.payload?.error || '');

  switch (code) {
    case 'KYC_REQUIRED':
      return {
        code,
        title: 'Verificación requerida',
        body: message || 'Debes verificar tu identidad en la app Quilax antes de depositar o retirar.',
        action: 'kyc',
      };
    case 'UNDERAGE':
      return {
        code,
        title: 'Mayoría de edad',
        body: message || 'Debes ser mayor de 18 años.',
        action: null,
      };
    case 'BANK_REQUIRED':
      return {
        code,
        title: 'Cuenta bancaria',
        body: message || 'Conecta tu banco con Stripe para continuar.',
        action: 'bank',
      };
    case 'GEO_BLOCKED':
      return {
        code,
        title: 'Región no disponible',
        body: message || 'Quilax no está disponible en tu región por ahora.',
        action: null,
      };
    case 'ACCOUNT_BANNED':
      return {
        code,
        title: 'Cuenta suspendida',
        body: message || 'Tu cuenta está suspendida. Contacta con soporte.',
        action: 'support',
      };
    default:
      return {
        code: code || null,
        title: 'Error',
        body: message || 'No se pudo completar la operación.',
        action: null,
      };
  }
}
