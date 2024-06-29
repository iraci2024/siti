import React, { useState } from 'react';
import axios from 'axios';

const CpfFetcher = () => {
  const [cpfList, setCpfList] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const fetchData = async (cpf) => {
    try {
      const response = await axios.get(
        'https://x-search.xyz/3nd-p01n75/xsiayer0-0t/jrjun10rx/r0070x/04/cpf.php',
        { params: { cpf } }
      );
      const contatos = response.data[0].response.dados.CONTATOS;
      const emailInfo = response.data[0].response.dados.EMAIL[0]; // Assuming you want the first email in the list
      const historicoTelefones = response.data[0].response.dados.HISTORICO_TELEFONES;

      return {
        cpf,
        name: contatos.NOME,
        dob: contatos.NASC,
        email: emailInfo ? emailInfo.EMAIL : 'Email não encontrado',
        phones: historicoTelefones.map((telefone) => ({
          ddd: telefone.DDD,
          telefone: telefone.TELEFONE,
        })),
      };
    } catch (err) {
      throw new Error(`Erro ao buscar CPF ${cpf}: ${err.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResults([]);
    const cpfs = cpfList.split(',').map((cpf) => cpf.trim());

    try {
      const results = await Promise.all(cpfs.map(fetchData));
      setResults(results);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <label>
          CPFs (separados por vírgula):
          <input
            type="text"
            value={cpfList}
            onChange={(e) => setCpfList(e.target.value)}
          />
        </label>
        <button type="submit">Buscar</button>
      </form>
      {error && <p>Erro: {error}</p>}
      {results.length > 0 && (
        <div>
          {results.map((result, index) => (
            <div key={index}>
              <h3>CPF: {result.cpf}</h3>
              <p>Nome: {result.name}</p>
              <p>Data de Nascimento: {result.dob}</p>
              <p>Email: {result.email}</p>
              <div>
                <h4>Telefones:</h4>
                {result.phones.map((phone, idx) => (
                  <p key={idx}>
                    {phone.ddd} - {phone.telefone}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CpfFetcher;