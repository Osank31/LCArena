import {
    useCallback,
    useRef,
    useState,
    type CSSProperties,
    type PointerEvent as ReactPointerEvent,
    type ReactNode,
} from "react";

/**
 * <Resizable> wraps any children in a box the user can resize by dragging.
 *
 * Usage
 *   <Resizable defaultWidth={400} defaultHeight={250} handles={["e", "s", "se"]}>
 *     <MyChart />
 *   </Resizable>
 *
 * Children are placed in a wrapper that fills the box (width: 100%, height: 100%),
 * so charts, images, textareas, cards, etc. can stretch to the new size.
 */

export type HandleDirection =
    | "n"
    | "s"
    | "e"
    | "w"
    | "ne"
    | "nw"
    | "se"
    | "sw";

export interface Size {
    width: number;
    height: number;
}

export interface ResizableProps {
    children?: ReactNode;
    /** Initial size in px. Default 320 x 220. */
    defaultWidth?: number;
    defaultHeight?: number;
    /** Lower bounds in px. Default 80 x 60. */
    minWidth?: number;
    minHeight?: number;
    /** Upper bounds in px. Default Infinity. */
    maxWidth?: number;
    maxHeight?: number;
    /** Which handles to render. Default ["e", "s", "se"]. */
    handles?: HandleDirection[];
    /** Called on every size change while dragging. */
    onResize?: (size: Size) => void;
    onResizeStart?: (size: Size) => void;
    onResizeEnd?: (size: Size) => void;
    /** Turns resizing off and hides the handles. */
    disabled?: boolean;
    className?: string;
    style?: CSSProperties;
}

interface Box extends Size {
    /** Shift applied when dragging the west / north edges so the opposite edge stays put. */
    x: number;
    y: number;
}

interface DragState {
    dir: HandleDirection;
    startX: number;
    startY: number;
    startBox: Box;
}

const ACCENT = "#3b82f6";
const BORDER = "#94a3b8";
const GRIP = "#64748b";

const HANDLE_THICKNESS = 10;
const CORNER_SIZE = 16;

const HANDLE_DEFS: Record<
    HandleDirection,
    { cursor: CSSProperties["cursor"]; style: CSSProperties }
> = {
    n: {
        cursor: "ns-resize",
        style: {
            top: -HANDLE_THICKNESS / 2,
            left: CORNER_SIZE,
            right: CORNER_SIZE,
            height: HANDLE_THICKNESS,
        },
    },
    s: {
        cursor: "ns-resize",
        style: {
            bottom: -HANDLE_THICKNESS / 2,
            left: CORNER_SIZE,
            right: CORNER_SIZE,
            height: HANDLE_THICKNESS,
        },
    },
    e: {
        cursor: "ew-resize",
        style: {
            right: -HANDLE_THICKNESS / 2,
            top: CORNER_SIZE,
            bottom: CORNER_SIZE,
            width: HANDLE_THICKNESS,
        },
    },
    w: {
        cursor: "ew-resize",
        style: {
            left: -HANDLE_THICKNESS / 2,
            top: CORNER_SIZE,
            bottom: CORNER_SIZE,
            width: HANDLE_THICKNESS,
        },
    },
    ne: {
        cursor: "nesw-resize",
        style: {
            top: -CORNER_SIZE / 2,
            right: -CORNER_SIZE / 2,
            width: CORNER_SIZE,
            height: CORNER_SIZE,
        },
    },
    nw: {
        cursor: "nwse-resize",
        style: {
            top: -CORNER_SIZE / 2,
            left: -CORNER_SIZE / 2,
            width: CORNER_SIZE,
            height: CORNER_SIZE,
        },
    },
    se: {
        cursor: "nwse-resize",
        style: {
            bottom: -CORNER_SIZE / 2,
            right: -CORNER_SIZE / 2,
            width: CORNER_SIZE,
            height: CORNER_SIZE,
        },
    },
    sw: {
        cursor: "nesw-resize",
        style: {
            bottom: -CORNER_SIZE / 2,
            left: -CORNER_SIZE / 2,
            width: CORNER_SIZE,
            height: CORNER_SIZE,
        },
    },
};

const clamp = (value: number, min: number, max: number): number =>
    Math.min(Math.max(value, min), max);

type HandlePointerEvent = ReactPointerEvent<HTMLDivElement>;

interface HandleProps {
    dir: HandleDirection;
    active: boolean;
    onPointerDown: (
        e: HandlePointerEvent,
        dir: HandleDirection
    ) => void;
    onPointerMove: (e: HandlePointerEvent) => void;
    onPointerUp: (e: HandlePointerEvent) => void;
}

function Handle({
    dir,
    active,
    onPointerDown,
    onPointerMove,
    onPointerUp,
}: HandleProps) {
    const [hovered, setHovered] = useState(false);
    const def = HANDLE_DEFS[dir];
    const isCorner = dir.length === 2;
    const lit = hovered || active;

    const indicatorSize: CSSProperties = isCorner
        ? { width: 9, height: 9 }
        : dir === "n" || dir === "s"
            ? { width: 32, height: 5 }
            : { width: 5, height: 32 };

    return (
        <div
            role="separator"
            aria-label={`Resize ${dir}`}
            data-resize-handle={dir}
            onPointerDown={(e) => onPointerDown(e, dir)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
            style={{
                position: "absolute",
                zIndex: 10,
                cursor: def.cursor,
                touchAction: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...def.style,
            }}
        >
            <div
                style={{
                    borderRadius: 999,
                    background: lit ? ACCENT : GRIP,
                    border: "1px solid #fff",
                    boxSizing: "border-box",
                    transition: "background 120ms",
                    pointerEvents: "none",
                    ...indicatorSize,
                }}
            />
        </div>
    );
}

export default function Resizable({
    children,
    defaultWidth = 320,
    defaultHeight = 220,
    minWidth = 80,
    minHeight = 60,
    maxWidth = Infinity,
    maxHeight = Infinity,
    handles = ["e", "s", "se"],
    onResize,
    onResizeStart,
    onResizeEnd,
    disabled = false,
    className,
    style,
}: ResizableProps) {
    const [box, setBox] = useState<Box>({
        width: clamp(defaultWidth, minWidth, maxWidth),
        height: clamp(defaultHeight, minHeight, maxHeight),
        x: 0,
        y: 0,
    });

    const [activeDir, setActiveDir] =
        useState<HandleDirection | null>(null);

    const [hovered, setHovered] = useState(false);

    const drag = useRef<DragState | null>(null);

    const handlePointerDown = useCallback(
        (e: HandlePointerEvent, dir: HandleDirection) => {
            if (disabled || e.button > 0) return;

            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);

            drag.current = {
                dir,
                startX: e.clientX,
                startY: e.clientY,
                startBox: box,
            };

            setActiveDir(dir);
            document.body.style.userSelect = "none";
            document.body.style.cursor =
                HANDLE_DEFS[dir].cursor ?? "";

            onResizeStart?.({
                width: box.width,
                height: box.height,
            });
        },
        [box, disabled, onResizeStart]
    );

    const handlePointerMove = useCallback(
        (e: HandlePointerEvent) => {
            const d = drag.current;
            if (!d) return;

            const dx = e.clientX - d.startX;
            const dy = e.clientY - d.startY;
            const { startBox, dir } = d;

            let { width, height, x, y } = startBox;

            if (dir.includes("e")) {
                width = clamp(
                    startBox.width + dx,
                    minWidth,
                    maxWidth
                );
            }

            if (dir.includes("w")) {
                width = clamp(
                    startBox.width - dx,
                    minWidth,
                    maxWidth
                );
                x = startBox.x + (startBox.width - width);
            }

            if (dir.includes("s")) {
                height = clamp(
                    startBox.height + dy,
                    minHeight,
                    maxHeight
                );
            }

            if (dir.includes("n")) {
                height = clamp(
                    startBox.height - dy,
                    minHeight,
                    maxHeight
                );
                y = startBox.y + (startBox.height - height);
            }

            setBox({ width, height, x, y });
            onResize?.({ width, height });
        },
        [
            minWidth,
            minHeight,
            maxWidth,
            maxHeight,
            onResize,
        ]
    );

    const handlePointerUp = useCallback(
        (e: HandlePointerEvent) => {
            if (!drag.current) return;

            if (
                e.currentTarget.hasPointerCapture?.(
                    e.pointerId
                )
            ) {
                e.currentTarget.releasePointerCapture(
                    e.pointerId
                );
            }

            drag.current = null;
            setActiveDir(null);

            document.body.style.userSelect = "";
            document.body.style.cursor = "";

            onResizeEnd?.({
                width: box.width,
                height: box.height,
            });
        },
        [box.width, box.height, onResizeEnd]
    );

    return (
        <div
            className={className}
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
            style={{
                position: "relative",
                boxSizing: "border-box",
                width: box.width,
                height: box.height,
                transform:
                    box.x || box.y
                        ? `translate(${box.x}px, ${box.y}px)`
                        : undefined,

                // Thicker, solid border instead of dashed
                border: `3px solid ${!disabled && (hovered || activeDir)
                        ? ACCENT
                        : BORDER
                    }`,

                borderRadius: 8,
                transition:
                    "border-color 120ms, box-shadow 120ms",

                ...style,
            }}
        >
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    overflow: "auto",
                }}
            >
                {children}
            </div>

            {!disabled &&
                handles.map((dir) => (
                    <Handle
                        key={dir}
                        dir={dir}
                        active={activeDir === dir}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                    />
                ))}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Example: delete this block in your project                          */
/* ------------------------------------------------------------------ */

export function Demo() {
    const [size, setSize] = useState<Size>({
        width: 360,
        height: 240,
    });

    return (
        <div
            style={{
                padding: 48,
                fontFamily: "system-ui, sans-serif",
            }}
        >
            <p
                style={{
                    marginBottom: 16,
                    color: "#555",
                }}
            >
                {Math.round(size.width)} ×{" "}
                {Math.round(size.height)}px
            </p>

            <Resizable
                defaultWidth={360}
                defaultHeight={240}
                minWidth={160}
                minHeight={100}
                maxWidth={900}
                handles={[
                    "n",
                    "s",
                    "e",
                    "w",
                    "ne",
                    "nw",
                    "se",
                    "sw",
                ]}
                onResize={setSize}
                style={{ background: "#fff" }}
            >
                <textarea
                    defaultValue="Any child can go in here. Drag an edge or corner to resize."
                    style={{
                        width: "100%",
                        height: "100%",
                        boxSizing: "border-box",
                        padding: 16,
                        border: "none",
                        resize: "none",
                        outline: "none",
                        font: "inherit",
                        background: "transparent",
                    }}
                />
            </Resizable>
        </div>
    );
}