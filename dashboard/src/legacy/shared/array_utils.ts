export function onlyInLeft<T>(
  left: Array<T>,
  right: Array<T>,
  compareFunction: (leftValue: T, rightValue: T) => boolean
): Array<T> {
  return left.filter(
    (leftValue) =>
      !right.some((rightValue) => compareFunction(leftValue, rightValue))
  );
}
