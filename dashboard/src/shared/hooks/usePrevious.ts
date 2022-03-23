import { useEffect, useRef } from "react";

export const usePrevious = <ValueType = any>(
  value: ValueType,
  initialValue: ValueType
) => {
  const ref = useRef<ValueType>(initialValue);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};
