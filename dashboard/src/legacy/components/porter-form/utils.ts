import { merge, unionBy } from "lodash";
import { KeyValueType } from "main/home/cluster-dashboard/env-groups/EnvGroupArray";
import { GenericInputField } from "./types";

export const hasSetValue = (field: GenericInputField) => {
  return field.value && field.value.length != 0 && field.value[0] != null;
};

export const fillWithDeletedVariables = (
  originalValues: {
    key: string;
    value: string;
  }[],
  newValues: {
    key: string;
    value: string;
  }[]
) => {
  const filledArray = originalValues.map((originalVal) => {
    const foundNewValue = newValues.find(
      (newValue) => newValue.key === originalVal.key
    );
    if (!foundNewValue) {
      return {
        key: originalVal.key,
        value: null,
      };
    } else {
      return foundNewValue;
    }
  });

  return unionBy(filledArray, newValues, "key");
};
