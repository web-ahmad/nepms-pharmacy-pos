export const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(val);
};
