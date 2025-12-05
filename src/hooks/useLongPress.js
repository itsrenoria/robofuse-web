import { useRef, useCallback } from 'react';

const useLongPress = (onLongPress, onClick, { shouldPreventDefault = true, delay = 500 } = {}) => {
    const timeout = useRef();
    const target = useRef();

    const start = useCallback(
        (event) => {
            if (shouldPreventDefault && event.target) {
                target.current = event.target;
            }
            timeout.current = setTimeout(() => {
                onLongPress(event);
            }, delay);
        },
        [onLongPress, delay, shouldPreventDefault]
    );

    const clear = useCallback(
        (event, shouldTriggerClick = true) => {
            timeout.current && clearTimeout(timeout.current);
            shouldTriggerClick && !timeout.current && onClick && onClick(event);
            timeout.current = null;
            target.current = null;
        },
        [onClick]
    );

    return {
        onMouseDown: (e) => start(e),
        onTouchStart: (e) => start(e),
        onMouseUp: (e) => clear(e),
        onMouseLeave: (e) => clear(e, false),
        onTouchEnd: (e) => clear(e),
    };
};

export default useLongPress;
