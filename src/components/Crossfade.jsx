import { useEffect, useRef, useState } from "react";
import "./Crossfade.css";

const DURATION_MS = 620;

/**
 * Плавная смена содержимого: прежнее уходит в прозрачность и чуть в сторону (−shift),
 * новое проявляется со смещением (+shift). Оба слоя лежат в одной ячейке сетки, поэтому
 * контейнер не «прыгает» по размеру. Содержимое меняется при смене `id`.
 */
export default function Crossfade({ id, shift = 24, className = "", children }) {
  const [state, setState] = useState({ id, leaving: null });
  // Последнее известное содержимое каждого id — из него строится уходящий слой.
  const snapshots = useRef(new Map());
  snapshots.current.set(id, children);

  if (state.id !== id) {
    setState({ id, leaving: { id: state.id, node: snapshots.current.get(state.id) } });
  }

  useEffect(() => {
    if (!state.leaving) return undefined;
    const timer = setTimeout(() => {
      snapshots.current.delete(state.leaving.id);
      setState((current) => ({ ...current, leaving: null }));
    }, DURATION_MS);
    return () => clearTimeout(timer);
  }, [state.leaving]);

  return (
    <div className={`xfade ${className}`.trim()} style={{ "--xf-shift": `${shift}px` }}>
      {state.leaving && (
        <div className="xfade__layer is-out" key={`out-${state.leaving.id}`} aria-hidden="true">
          {state.leaving.node}
        </div>
      )}
      <div className={`xfade__layer ${state.leaving ? "is-in" : ""}`} key={`in-${id}`}>
        {children}
      </div>
    </div>
  );
}
