/**
 * Number to Words converter for business documents (French, Arabic, English)
 */

export function numberToFrench(n) {
  if (n === 0) return 'zéro'
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf']
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix']

  function convertBelow100(val) {
    if (val < 10) return units[val]
    if (val < 20) return teens[val - 10]
    const t = Math.floor(val / 10)
    const u = val % 10
    if (t === 7) {
      if (u === 1) return 'soixante et onze'
      return 'soixante-' + teens[u]
    }
    if (t === 8) {
      if (u === 0) return 'quatre-vingts'
      return 'quatre-vingt-' + units[u]
    }
    if (t === 9) {
      return 'quatre-vingt-' + teens[u]
    }
    if (u === 1 && t < 8) return tens[t] + ' et un'
    if (u === 0) return tens[t]
    return tens[t] + '-' + units[u]
  }

  function convertBelow1000(val) {
    if (val < 100) return convertBelow100(val)
    const h = Math.floor(val / 100)
    const r = val % 100
    let hStr = h === 1 ? 'cent' : units[h] + ' cent'
    if (h > 1 && r === 0) hStr += 's'
    if (r === 0) return hStr
    return hStr + ' ' + convertBelow100(r)
  }

  function convert(val) {
    if (val < 1000) return convertBelow1000(val)
    if (val < 1000000) {
      const k = Math.floor(val / 1000)
      const r = val % 1000
      let kStr = k === 1 ? 'mille' : convertBelow1000(k) + ' mille'
      if (r === 0) return kStr
      return kStr + ' ' + convertBelow1000(r)
    }
    if (val < 1000000000) {
      const m = Math.floor(val / 1000000)
      const r = val % 1000000
      let mStr = m === 1 ? 'un million' : convertBelow1000(m) + ' millions'
      if (r === 0) return mStr
      return mStr + ' ' + convert(r)
    }
    const b = Math.floor(val / 1000000000)
    const r = val % 1000000000
    let bStr = b === 1 ? 'un milliard' : convertBelow1000(b) + ' milliards'
    if (r === 0) return bStr
    return bStr + ' ' + convert(r)
  }

  const res = convert(n)
  return res.charAt(0).toUpperCase() + res.slice(1)
}

export function numberToEnglish(n) {
  if (n === 0) return 'Zero'
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  function convertBelow100(val) {
    if (val < 10) return units[val]
    if (val < 20) return teens[val - 10]
    const t = Math.floor(val / 10)
    const u = val % 10
    return tens[t] + (u > 0 ? '-' + units[u] : '')
  }

  function convertBelow1000(val) {
    if (val < 100) return convertBelow100(val)
    const h = Math.floor(val / 100)
    const r = val % 100
    return units[h] + ' Hundred' + (r > 0 ? ' ' + convertBelow100(r) : '')
  }

  function convert(val) {
    if (val < 1000) return convertBelow1000(val)
    if (val < 1000000) {
      const k = Math.floor(val / 1000)
      const r = val % 1000
      return convertBelow1000(k) + ' Thousand' + (r > 0 ? ' ' + convertBelow1000(r) : '')
    }
    if (val < 1000000000) {
      const m = Math.floor(val / 1000000)
      const r = val % 1000000
      return convertBelow1000(m) + ' Million' + (r > 0 ? ' ' + convert(r) : '')
    }
    const b = Math.floor(val / 1000000000)
    const r = val % 1000000000
    return convertBelow1000(b) + ' Billion' + (r > 0 ? ' ' + convert(r) : '')
  }

  return convert(n)
}

export function numberToArabic(n) {
  if (n === 0) return 'صفر'
  const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة']
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر']
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون']
  const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة']

  function convertBelow100(val) {
    if (val < 10) return units[val]
    if (val < 20) return teens[val - 10]
    const t = Math.floor(val / 10)
    const u = val % 10
    if (u === 0) return tens[t]
    return units[u] + ' و' + tens[t]
  }

  function convertBelow1000(val) {
    if (val < 100) return convertBelow100(val)
    const h = Math.floor(val / 100)
    const r = val % 100
    if (r === 0) return hundreds[h]
    return hundreds[h] + ' و' + convertBelow100(r)
  }

  function convert(val) {
    if (val < 1000) return convertBelow1000(val)
    if (val < 1000000) {
      const k = Math.floor(val / 1000)
      const r = val % 1000
      let kStr = ''
      if (k === 1) kStr = 'ألف'
      else if (k === 2) kStr = 'ألفان'
      else if (k >= 3 && k <= 10) kStr = convertBelow100(k) + ' آلاف'
      else kStr = convertBelow1000(k) + ' ألفاً'

      if (r === 0) return kStr
      return kStr + ' و' + convertBelow1000(r)
    }
    const m = Math.floor(val / 1000000)
    const r = val % 1000000
    let mStr = m === 1 ? 'مليون' : convertBelow1000(m) + ' مليون'
    if (r === 0) return mStr
    return mStr + ' و' + convert(r)
  }

  return convert(n)
}

export function formatAmountInWords(cents, lang = 'fr') {
  const dinars = Math.floor((cents || 0) / 100)
  const centimes = (cents || 0) % 100

  if (lang === 'ar') {
    let text = numberToArabic(dinars) + ' دينار جزائري'
    if (centimes > 0) {
      text += ' و' + numberToArabic(centimes) + ' سنتيم'
    }
    return text
  }

  if (lang === 'en') {
    let text = numberToEnglish(dinars) + ' Algerian Dinars'
    if (centimes > 0) {
      text += ' and ' + numberToEnglish(centimes) + ' Cents'
    }
    return text
  }

  // Default: French
  let text = numberToFrench(dinars) + ' dinars algériens'
  if (centimes > 0) {
    text += ' et ' + numberToFrench(centimes).toLowerCase() + ' centimes'
  }
  return text
}
