import { StackFrame } from "stacktrace-js";

export const stackFramesToString = (stackFrames: StackFrame[]) => {
  return stackFrames
    .map(function (sf) {
      return sf.toString();
    })
    .join("\n");
};
