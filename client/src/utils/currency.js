export const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '৳0';
  }
  return '৳' + Number(value).toLocaleString('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};