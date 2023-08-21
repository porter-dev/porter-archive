import { useLayoutEffect, useRef } from "react";

/*
 *
 * useResizeObserver takes in a callback function and returns a ref
 * that can be attached to a DOM element. The callback function will
 * be called whenever the DOM element is resized.
 *
 */
function useResizeObserver<T extends HTMLElement>(
  callback: (target: T) => void
) {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const element = ref?.current;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver(() => {
      callback(element);
    });

    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [callback, ref]);

  return ref;
}

export default useResizeObserver;
