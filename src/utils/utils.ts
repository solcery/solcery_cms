import { useCallback, useState, useRef, useEffect } from "react";

export function useLocalStorageState(key: string, defaultState?: string) {
  const [state, setState] = useState(() => {
    // NOTE: Not sure if this is ok
    const storedState = localStorage.getItem(key);
    if (storedState) {
      return JSON.parse(storedState);
    }
    return defaultState;
  });

  const setLocalStorageState = useCallback(
    (newState) => {
      const changed = state !== newState;
      if (!changed) {
        return;
      }
      setState(newState);
      if (newState === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(newState));
      }
    },
    [state, key]
  );

  return [state, setLocalStorageState];
}

export const useInterval = (callback: any, interval: number, immediate: boolean) => {
  const ref: any = useRef();

  // keep reference to callback without restarting the interval
  useEffect(() => {
    ref.current = callback;
  }, [callback]);

  useEffect(() => {
    // when this flag is set, closure is stale
    let cancelled = false;

    // wrap callback to pass isCancelled getter as an argument
    const fn = () => {
      ref.current(() => cancelled);
    };

    // set interval and run immediately if requested
    const id = setInterval(fn, interval);
    if (immediate) fn();

    // define cleanup logic that runs
    // when component is unmounting
    // or when or interval or immediate have changed
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [interval, immediate]);
};
