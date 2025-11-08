import React from "react";
import { createPortal } from "react-dom";

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
  "2xl": "max-w-3xl",
};

const Modal = ({ isOpen, onClose, title, children, size = "md" }) => {
  if (!isOpen) return null;

  const widthClass = sizeClasses[size] || sizeClasses.md;

  const modal = (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 fade-in">
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg p-6 ${widthClass} w-full shadow-xl ring-1 ring-gray-200 dark:ring-0 scale-in soft-shadow-md`}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>
        <div className="text-gray-900 dark:text-white">
          {/* content wrapper gives form inputs a subtle off-white background in light mode
              so inputs and borders are visible against the modal surface */}
          <div className="bg-blue-50 dark:bg-gray-800 p-4 rounded-md -mx-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  // render modal into document body so nested modals stack correctly
  if (typeof document !== "undefined") {
    return createPortal(modal, document.body);
  }

  // fallback for environments without document
  return modal;
};

export default Modal;
