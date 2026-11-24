// Doctor balance on the budget forms.
//   balance  = from earlier months + what we pay now − accrued by prescriptions
//   to pay   = what we owe the doctor this month (accrued − what's already on the balance)
// negative balance = we owe the doctor, positive = paid ahead
export const BTXT = {
  ka: { paid: 'რა თანხას ვუხდით ექიმს', toPay: 'გადასახდელი თანხა', balance: 'ექიმის ბალანსი', accrued: 'რეცეპტების მიხედვით დარიცხული თანხა', fromPrev: 'წინა თვეებიდან', owe: 'ექიმს ვალში ვართ', ahead: 'ექიმს ავანსად აქვს', even: 'ანგარიში სწორია' },
  en: { paid: 'What we pay the doctor', toPay: 'Amount to pay', balance: 'Doctor balance', accrued: 'Accrued from prescriptions', fromPrev: 'From previous months', owe: 'We owe the doctor', ahead: 'Doctor is paid ahead', even: 'Settled' },
  ru: { paid: 'Сколько платим врачу', toPay: 'Сумма к оплате', balance: 'Баланс врача', accrued: 'Начислено по рецептам', fromPrev: 'С прошлых месяцев', owe: 'Мы должны врачу', ahead: 'Врачу выплачено вперёд', even: 'Расчёт закрыт' },
}

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100

export function doctorBalance(computed, paid) {
  const opening = r2(computed?.openingBalance)
  const accrued = r2(computed?.payableAmt)
  const balance = r2(opening + (parseFloat(paid) || 0) - accrued)
  const toPay = r2(Math.max(0, accrued - opening))
  return { opening, accrued, balance, toPay }
}

export const balanceState = (n) => (n < 0 ? 'owe' : n > 0 ? 'ahead' : 'even')
