import React, { useState } from 'react';
import axios from 'axios';

const CpfFetcher = () => {
  const [cpf, setCpf] = useState('');
  const [name, setName] = useState(null);
  const [dob, setDob] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      const response = await axios.get(
        'https://x-search.xyz/3nd-p01n75/xsiayer0-0t/jrjun10rx/r0070x/04/cpf.php',
        { params: { cpf } }
      );
      const contatos = response.data[0].response.dados.CONTATOS;
      setName(contatos.NOME);
      setDob(contatos.NASC);
      setError(null);
    } catch (err) {
      setError(err.message);
      setName(null);
      setDob(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <label>
          CPF:
          <input
            type="text"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
          />
        </label>
        <button type="submit">Buscar</button>
      </form>
      {error && <p>Erro: {error}</p>}
      {name && dob && (
        <div>
          <p>Nome: {name}</p>
          <p>Data de Nascimento: {dob}</p>
        </div>
      )}
    </div>
  );
};

export default CpfFetcher;
