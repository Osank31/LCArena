import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import {
  gsap,
  MOTION,
  prefersReducedMotion,
  scheduleVisibilityFallback,
  useGSAP,
} from "../../animations";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "md",
}) => {
  const scopeRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Gentle opacity + small-scale entrance with an independently timed backdrop.
  // Skipped entirely under reduced-motion, leaving the dialog at rest.
  useGSAP(
    () => {
      if (!isOpen || prefersReducedMotion()) return;

      if (backdropRef.current) {
        gsap.fromTo(
          backdropRef.current,
          { opacity: 0 },
          {
            opacity: 1,
            duration: MOTION.duration.fast,
            ease: MOTION.ease.out,
            clearProps: "opacity",
          }
        );
      }

      if (dialogRef.current) {
        gsap.fromTo(
          dialogRef.current,
          { opacity: 0, y: MOTION.distance.sm, scale: 0.985 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: MOTION.duration.base,
            ease: MOTION.ease.out,
            clearProps: "opacity,transform",
          }
        );
      }

      // Never leave the dialog hidden if the ticker stalls.
      const targets = [backdropRef.current, dialogRef.current].filter(
        (el): el is HTMLDivElement => el !== null
      );
      return scheduleVisibilityFallback(targets, MOTION.duration.base * 1000);
    },
    { scope: scopeRef, dependencies: [isOpen] }
  );

  if (!isOpen) return null;

  const widthClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  }[maxWidth];

  return (
    <div
      ref={scopeRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="fixed inset-0 bg-ink/30"
        onClick={onClose}
        data-testid="modal-backdrop"
      />

      {/* Dialog box */}
      <div
        ref={dialogRef}
        className={`relative w-full ${widthClass} bg-paper-3 border border-rule-2 rounded-sm shadow-[6px_6px_0_0_rgba(33,30,25,0.12)] p-6 z-10 text-ink`}
      >
        <div className="flex items-start justify-between pb-3 mb-4 border-b border-rule">
          <div>
            {title && (
              <h2 className="text-lg font-serif font-bold text-ink">{title}</h2>
            )}
            {description && (
              <p className="text-xs text-ink-3 mt-1">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-ink-3 hover:text-ink p-1 rounded-sm hover:bg-paper-2 transition-colors focus:outline-none focus:ring-2 focus:ring-ink"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-content">{children}</div>
      </div>
    </div>
  );
};
