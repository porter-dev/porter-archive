import { GenericInputField } from "./types";

export const hasSetValue = (field: GenericInputField) => {
  return field.value && field.value.length != 0 && field.value[0] != null;
};
