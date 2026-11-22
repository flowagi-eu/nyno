export function nyno_date(args = [], context = {}) {
  const format = args[0] || 'Y-m-d';
  const setName = context.set_context ?? 'prev';

  let value;

  if (format === 'time' || format === 'timestamp') {
    value = Date.now();
  } else {
    const date = new Date();

    const values = {
      Y: date.getFullYear(),
      m: String(date.getMonth() + 1).padStart(2, '0'),
      d: String(date.getDate()).padStart(2, '0'),
      H: String(date.getHours()).padStart(2, '0'),
      i: String(date.getMinutes()).padStart(2, '0'),
      s: String(date.getSeconds()).padStart(2, '0'),
    };

    value = format.replace(/[YmdHis]/g, token => values[token]);
  }

  context[setName] = value;

  return 0;
}
