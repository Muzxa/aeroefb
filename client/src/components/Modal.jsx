import { useEffect, useRef } from "react";
import Icon from "./Icon";

export default function Modal({ title, onClose, children }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current.showModal();
    return () => {
      if (previous && previous.isConnected) previous.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="modal-header">
        <h2 id="modal-title">{title}</h2>
        <button
          className="icon-button"
          type="button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}
