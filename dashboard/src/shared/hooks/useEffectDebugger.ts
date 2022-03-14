import { useEffect } from "react";
import { usePrevious } from "./usePrevious";

export const useEffectDebugger = (
  effectHook: any,
  dependencies: any,
  dependencyNames: any = []
) => {
  const previousDeps = usePrevious(dependencies, []);

  const changedDeps = dependencies.reduce(
    (accum: any, dependency: any, index: any) => {
      if (dependency !== previousDeps[index]) {
        const keyName = dependencyNames[index] || index;
        return {
          ...accum,
          [keyName]: {
            before: previousDeps[index],
            after: dependency,
          },
        };
      }

      return accum;
    },
    {}
  );

  if (Object.keys(changedDeps).length) {
    console.log("[use-effect-debugger] ", changedDeps);
  }

  useEffect(effectHook, dependencies);
};
