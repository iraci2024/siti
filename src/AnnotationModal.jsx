import React, { useState } from 'react';

const AnnotationModal = ({ isOpen, onClose, onSave, initialNote }) => {
  const [note, setNote] = useState(initialNote);

  const handleInputChange = (e) => {
    setNote(e.target.value);
  };

  const handleSave = () => {
    onSave(note);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <span className="close" onClick={onClose}>&times;</span>
        <h2>Adicionar Anotação</h2>
        <textarea
          rows={10}
          cols={50}
          value={note}
          onChange={handleInputChange}
          maxLength={10000}
          placeholder="Digite suas anotações aqui (limite de 10.000 caracteres)"
        />
        <br />
        <button onClick={handleSave}>Salvar</button>
      </div>
    </div>
  );
};

export default AnnotationModal;
