import { useState } from "react";
import { api } from "../api";
import Modal from "./Modal";

export default function DeleteRecordDialog({ title, noun, path, online, onClose, onDeleted, children }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (!online || pending) return;
    setPending(true);
    setError("");
    try {
      await api(path, { method: "DELETE" });
    } catch (error) {
      setError(error.message);
      setPending(false);
      return;
    }
    await onDeleted();
    onClose();
  }

  return (
    <Modal title={title} onClose={() => { if (!pending) onClose(); }}>
      <p>{children}</p>
      {error && <p className="record-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button className="button secondary" disabled={pending} onClick={onClose}>
          Keep {noun}
        </button>
        <button className="button record-danger" disabled={pending || !online} onClick={remove}>
          {pending ? "Deleting…" : `Delete ${noun}`}
        </button>
      </div>
    </Modal>
  );
}
