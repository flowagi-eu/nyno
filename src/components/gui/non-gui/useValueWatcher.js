export function useValueWatcher(getValue, postFn, delay = 500) {
  let previousValue = getValue();
  let timer = null;
  let stopped = false;

  const check = () => {
    if (stopped) return;

    const currentValue = getValue();

    if (JSON.stringify(currentValue) !== JSON.stringify(previousValue)) {
      previousValue = currentValue;

      clearTimeout(timer);

      timer = setTimeout(() => {
        postFn(currentValue);
      }, delay);
    }

    requestAnimationFrame(check);
  };

  check();

  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}