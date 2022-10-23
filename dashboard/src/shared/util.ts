export const isJSON = (value: string): boolean => {
  try {
    JSON.parse(value);
    return true;
  } catch (err) {
    return false;
  }
};
