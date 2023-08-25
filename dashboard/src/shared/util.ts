export const isJSON = (value: string): boolean => {
  try {
    JSON.parse(value);
    return true;
  } catch (err) {
    return false;
  }
};

export function valueExists<T>(value: T | null | undefined): value is T {
  return !!value;
}


export const PREFLIGHT_MESSAGE_CONST = {
  "apiEnabled": "APIs enabled on service account",
  "cidrAvailability": "Given CIDRs are available"
}