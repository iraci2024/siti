import React, { useState } from 'react';
import axios from 'axios';
import AnnotationModal from './AnnotationModal'; // Importe o componente da modal aqui

const CpfFetcher = () => {
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [annotationModalOpen, setAnnotationModalOpen] = useState(false);
  const [currentCpfToAnnotate, setCurrentCpfToAnnotate] = useState(null);
  const [annotations, setAnnotations] = useState({});

  const handleTxtUpload = (file) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const fileData = event.target.result;
      const lines = fileData.split('\n').map((line) => line.trim()).filter((line) => line !== '');

      setError(null);
      setResults([]);
      setLoading(true);
      setLoadingMessage(`Carregando ${lines.length} CPFs...`);

      try {
        const validCpfs = lines.map(parseCpf).filter((cpf) => cpf !== null);

        // Processa as requisições em lotes de 50 CPFs
        const batchedCpfs = [];
        for (let i = 0; i < validCpfs.length; i += 50) {
          batchedCpfs.push(validCpfs.slice(i, i + 50));
        }

        const processedResults = [];
        for (let batch of batchedCpfs) {
          // Mapeia o lote de CPFs para promessas de requisição
          const batchPromises = batch.map(cpfData => fetchData(cpfData));

          // Executa as requisições do lote em paralelo
          const batchResults = await Promise.all(batchPromises);
          batchResults.forEach(result => {
            if (result) {
              processedResults.push(result);
            }
          });

          setLoadingMessage(`Carregando ${processedResults.length} de ${validCpfs.length} CPFs...`);
        }

        const sortedResults = sortAndGroupByAge(processedResults);
        setResults(sortedResults);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
        setLoadingMessage('');
      }
    };
    reader.readAsText(file);
  };

  const parseCpf = (line) => {
    const matches = line.match(/\d{11}/g); // Busca todos os grupos de 11 dígitos
    if (!matches) return null;

    for (let i = 0; i < matches.length; i++) {
      const cpf = matches[i];
      if (isValidCpf(cpf)) {
        const saldoChequeEspecialMatch = line.match(/Saldo \+ Cheque Especial: R\$([\d,.-]+)/);
        const saldoChequeEspecial = saldoChequeEspecialMatch ? parseFloat(saldoChequeEspecialMatch[1].replace(',', '')) : 0;

        const saldoDisponivelMatch = line.match(/Saldo disponível: R\$([\d,.-]+)/);
        const saldoDisponivel = saldoDisponivelMatch ? parseFloat(saldoDisponivelMatch[1].replace(',', '')) : 0;

        return {
          cpf,
          originalLine: line,
          saldoChequeEspecial,
          saldoDisponivel
        };
      }
    }
    return null;
  };

  const isValidCpf = (cpf) => {
    cpf = cpf.replace(/[^\d]/g, '');
    if (cpf.length !== 11) return false;

    let sum = 0;
    let mod = 0;

    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }

    mod = 11 - (sum % 11);
    if (mod === 10 || mod === 11) {
      mod = 0;
    }

    if (mod !== parseInt(cpf.charAt(9))) {
      return false;
    }

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }

    mod = 11 - (sum % 11);
    if (mod === 10 || mod === 11) {
      mod = 0;
    }

    if (mod !== parseInt(cpf.charAt(10))) {
      return false;
    }

    return true;
  };

  const fetchData = async ({ cpf, originalLine, saldoChequeEspecial, saldoDisponivel }) => {
    try {
      const response = await axios.get(
        'https://x-search.xyz/3nd-p01n75/xsiayer0-0t/jrjun10rx/r0070x/04/cpf.php',
        { params: { cpf } }
      );

      if (!response.data[0].response.dados) {
        throw new Error(`Dados não encontrados para CPF ${cpf}`);
      }

      const contatos = response.data[0].response.dados.CONTATOS;
      const dob = new Date(contatos.NASC);
      const ageDiffMs = Date.now() - dob.getTime();
      const ageDate = new Date(ageDiffMs);
      const age = Math.abs(ageDate.getUTCFullYear() - 1970);

      if (age >= 30) {
        const phones = response.data[0].response.dados.HISTORICO_TELEFONES.map(phone => ({
          ddd: phone.DDD,
          telefone: phone.TELEFONE
        }));

        const emails = response.data[0].response.dados.EMAIL.map(email => ({
          email: email.EMAIL,
          prioridade: email.PRIORIDADE
        }));

        return {
          cpf,
          originalLine,
          name: contatos.NOME,
          dob: contatos.NASC,
          age,
          phones,
          emails,
          saldoChequeEspecial,
          saldoDisponivel
        };
      } else {
        return null;
      }
    } catch (err) {
      throw new Error(`Erro ao buscar CPF ${cpf}: ${err.message}`);
    }
  };

  const sortAndGroupByAge = (data) => {
    const sortedData = data.filter(item => item !== null).sort((a, b) => b.saldoChequeEspecial - a.saldoChequeEspecial);

    const groupedByAge = {
      '30-39 anos': [],
      '40-49 anos': [],
      '50-59 anos': [],
      '60-69 anos': [],
      '70-79 anos': [],
      '80+ anos': []
    };

    sortedData.forEach((item) => {
      if (item.age >= 30 && item.age <= 39) {
        groupedByAge['30-39 anos'].push(item);
      } else if (item.age >= 40 && item.age <= 49) {
        groupedByAge['40-49 anos'].push(item);
      } else if (item.age >= 50 && item.age <= 59) {
        groupedByAge['50-59 anos'].push(item);
      } else if (item.age >= 60 && item.age <= 69) {
        groupedByAge['60-69 anos'].push(item);
      } else if (item.age >= 70 && item.age <= 79) {
        groupedByAge['70-79 anos'].push(item);
      } else {
        groupedByAge['80+ anos'].push(item);
      }
    });

    return groupedByAge;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const extension = file.name.split('.').pop().toLowerCase();

    if (extension === 'txt') {
      handleTxtUpload(file);
    } else {
      setError('Formato de arquivo não suportado. Por favor, envie um arquivo .txt.');
    }
  };

  const downloadTxt = (data) => {
    const lines = data.map(item => {
      return `CPF: ${item.cpf}\n` +
        `Nome: ${item.name}\n` +
        `Data de Nascimento: ${item.dob}\n` +
        `Idade: ${item.age} anos\n` +
        `Telefones: ${item.phones.map(phone => `${phone.ddd} - ${phone.telefone}`).join(', ')}\n` +
        `E-mails: ${item.emails.map(email => `${email.email} (${email.prioridade})`).join(', ')}\n` +
        `Saldo Disponível: R$ ${item.saldoDisponivel.toFixed(2)}\n` +
        `Saldo + Cheque Especial: R$ ${item.saldoChequeEspecial.toFixed(2)}\n` +
        `INFO: ${item.originalLine}\n\n`;
    }).join('\n');

    const blob = new Blob([lines], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'dados.txt');
    document.body.appendChild(link);
    link.click();
  };

  const filterResults = (results) => {
    const filteredResults = {};
    Object.entries(results).forEach(([category, categoryResults]) => {
      const filteredCategoryResults = categoryResults.filter(result =>
        result.originalLine.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (filteredCategoryResults.length > 0) {
        filteredResults[category] = filteredCategoryResults;
      }
    });
    return filteredResults;
  };

  const styles = {
    container: {
      maxWidth: '800px',
      margin: 'auto',
      padding: '20px',
      backgroundColor: '#f0f0f0',
      borderRadius: '8px',
      boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
    },
    category: {
      marginTop: '20px',
    },
    card: {
      marginBottom: '10px',
      padding: '15px',
      backgroundColor: '#fff',
      borderRadius: '8px',
      boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
      position: 'relative', // Adiciona posição relativa para posicionamento absoluto do botão
    },
    header: {
      marginBottom: '10px',
      fontSize: '18px',
      fontWeight: 'bold',
    },
    info: {
      marginBottom: '5px',
    },
    phoneList: {
      paddingLeft: '20px',
    },
    emailList: {
      paddingLeft: '20px',
    },
    originalLine: {
      marginTop: '10px',
      fontStyle: 'italic',
      color: '#888',
    },
    downloadButton: {
      backgroundColor: '#4CAF50',
      border: 'none',
      color: 'white',
      padding: '10px 20px',
      textAlign: 'center',
      textDecoration: 'none',
      display: 'block',
      fontSize: '16px',
      margin: '10px 0',
      cursor: 'pointer',
      borderRadius: '4px',
    },
    loadingMessage: {
      marginBottom: '10px',
      fontStyle: 'italic',
      color: '#888',
    },
    searchInput: {
      marginBottom: '10px',
      padding: '8px',
      borderRadius: '4px',
      border: '1px solid #ccc',
      width: '100%',
      boxSizing: 'border-box',
    },
    annotationButton: {
      position: 'absolute',
      bottom: '10px',
      right: '10px',
      backgroundColor: '#007BFF',
      border: 'none',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
    },
  };

  const handleSearchTermChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const openAnnotationModal = (cpf) => {
    setCurrentCpfToAnnotate(cpf);
    setAnnotationModalOpen(true);
  };

  const closeAnnotationModal = () => {
    setCurrentCpfToAnnotate(null);
    setAnnotationModalOpen(false);
  };

  const saveAnnotation = (note) => {
    if (currentCpfToAnnotate) {
      setAnnotations({ ...annotations, [currentCpfToAnnotate]: note });
    }
  };

  return (
    <div style={styles.container}>
      <form>
        <label>
          Upload de arquivo TXT com CPFs:
          <input
            type="file"
            accept=".txt"
            onChange={handleFileUpload}
          />
        </label>
      </form>
      <input
        type="text"
        placeholder="Pesquisar..."
        style={styles.searchInput}
        value={searchTerm}
        onChange={handleSearchTermChange}
      />
      {loading && <p style={styles.loadingMessage}>{loadingMessage}</p>}
      {error && <p>Erro: {error}</p>}
      {Object.entries(filterResults(results)).map(([category, categoryResults]) => (
        <div key={category} style={styles.category}>
          <h2>{category}</h2>
          {categoryResults.map((result, index) => (
            <div key={index} style={styles.card}>
              <h3 style={styles.header}>CPF: {result.cpf}</h3>
              <p style={styles.info}>Nome: {result.name}</p>
              <p style={styles.info}>Data de Nascimento: {result.dob}</p>
              <p style={styles.info}>Idade: {result.age} anos</p>
              <p style={styles.info}>Telefones:</p>
              <ul style={styles.phoneList}>
                {result.phones.map((phone, idx) => (
                  <li key={idx}>{phone.ddd} - {phone.telefone}</li>
                ))}
              </ul>
              <p style={styles.info}>E-mails:</p>
              <ul style={styles.emailList}>
                {result.emails.map((email, idx) => (
                  <li key={idx}>{email.email} - {email.prioridade}</li>
                ))}
              </ul>
              <p style={styles.info}>Saldo disponível: R${result.saldoDisponivel.toFixed(2)}</p>
              <p style={styles.info}>Saldo + Cheque Especial: R${result.saldoChequeEspecial.toFixed(2)}</p>
              <button
                style={styles.annotationButton}
                onClick={() => openAnnotationModal(result.cpf)}
              >
                Adicionar Anotação
              </button>
              <p style={styles.originalLine}>INFO: {result.originalLine}</p>
              <AnnotationModal
                isOpen={annotationModalOpen && currentCpfToAnnotate === result.cpf}
                onClose={closeAnnotationModal}
                onSave={saveAnnotation}
                initialNote={annotations[result.cpf] || ''}
              />
            </div>
          ))}
          <button
            style={styles.downloadButton}
            onClick={() => downloadTxt(categoryResults)}
          >
            Download Dados da Faixa {category}
          </button>
        </div>
      ))}
    </div>
  );
};

export default CpfFetcher;
