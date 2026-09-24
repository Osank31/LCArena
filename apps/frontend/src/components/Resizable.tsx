import React, {
    useCallback,
    useRef,
    useState,
    useEffect,
    type CSSProperties,
    type ReactNode,
} from "react";

export interface ResizableProps {
    direction?: "horizontal" | "vertical";
    children: ReactNode;
    /** Initial size of the first panel as a percentage (0-100) */
    initialSize?: number;
    /** Minimum size of either panel in pixels */
    minSize?: number;
    /** Maximum size of the first panel in pixels */
    maxSize?: number;
    className?: string;
    style?: CSSProperties;
    onResize?: (size: number) => void;
}

export function Panel({ children, className, style }: { children: ReactNode, className?: string, style?: CSSProperties }) {
    return (
        <div className={className} style={{ width: "100%", height: "100%", overflow: "auto", ...style }}>
            {children}
        </div>
    );
}

export default function Resizable({
    direction = "horizontal",
    children,
    initialSize = 50,
    minSize = 50,
    maxSize = Infinity,
    className,
    style,
    onResize,
}: ResizableProps) {
    const isHorizontal = direction === "horizontal";
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState(initialSize);
    const [isDragging, setIsDragging] = useState(false);
    const [hovered, setHovered] = useState(false);

    const childArray = React.Children.toArray(children);
    if (childArray.length !== 2) {
        console.warn("Resizable component expects exactly two children.");
    }
    const [firstChild, secondChild] = childArray;

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return; // only left click
        e.preventDefault();
        setIsDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
    }, []);

    const handlePointerMove = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (!isDragging || !containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            let newPercentage = 0;

            if (isHorizontal) {
                const offsetX = e.clientX - rect.left;
                newPercentage = (offsetX / rect.width) * 100;
            } else {
                const offsetY = e.clientY - rect.top;
                newPercentage = (offsetY / rect.height) * 100;
            }

            const containerSize = isHorizontal ? rect.width : rect.height;
            const minPercent = (minSize / containerSize) * 100;
            const maxPercentByMin = 100 - minPercent;
            const maxPercent = maxSize === Infinity ? maxPercentByMin : Math.min(maxPercentByMin, (maxSize / containerSize) * 100);

            const clampedPercentage = Math.max(minPercent, Math.min(newPercentage, maxPercent));
            setSize(clampedPercentage);
            onResize?.(clampedPercentage);
        },
        [isDragging, isHorizontal, minSize, maxSize, onResize]
    );

    const handlePointerUp = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (isDragging) {
                setIsDragging(false);
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                }
            }
        },
        [isDragging]
    );

    useEffect(() => {
        if (isDragging) {
            document.body.style.userSelect = "none";
            document.body.style.cursor = isHorizontal ? "col-resize" : "row-resize";
        } else {
            document.body.style.userSelect = "";
            document.body.style.cursor = "";
        }
        return () => {
            document.body.style.userSelect = "";
            document.body.style.cursor = "";
        };
    }, [isDragging, isHorizontal]);

    return (
        <div
            ref={containerRef}
            className={className}
            style={{
                display: "flex",
                flexDirection: isHorizontal ? "row" : "column",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                ...style,
            }}
        >
            <div style={{ flex: `0 0 ${size}%`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                {firstChild}
            </div>

            <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onPointerEnter={() => setHovered(true)}
                onPointerLeave={() => setHovered(false)}
                style={{
                    position: "relative",
                    flex: "0 0 1px",
                    backgroundColor: isDragging
                        ? "#3b82f6"
                        : hovered
                            ? "#60a5fa"
                            : "#262626", // IDE dark border
                    cursor: isHorizontal ? "col-resize" : "row-resize",
                    transition: "background-color 0.2s ease",
                    zIndex: 10,
                }}
            >
                {/* Hit area extension */}
                <div
                    style={{
                        position: "absolute",
                        top: isHorizontal ? 0 : -4,
                        bottom: isHorizontal ? 0 : -4,
                        left: isHorizontal ? -4 : 0,
                        right: isHorizontal ? -4 : 0,
                        cursor: isHorizontal ? "col-resize" : "row-resize",
                        zIndex: 10,
                        backgroundColor: "transparent",
                    }}
                />
            </div>

            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                {secondChild}
            </div>
        </div>
    );
}