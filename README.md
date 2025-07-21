# azure-kanban-app
# Quadro de Tarefas Colaborativo com Azure
Este projeto é uma aplicação web full-stack de um quadro de tarefas no estilo Kanban, construída do zero e implantada na nuvem da Microsoft Azure. O objetivo foi transformar um protótipo simples em HTML/CSS/JS numa solução robusta, escalável e colaborativa em tempo real.

O quadro permite que múltiplos utilizadores criem, editem, movam, reordenem e excluam tarefas, com todas as alterações a serem refletidas instantaneamente no ecrã de todos os participantes, sem a necessidade de recarregar a página.

Este projeto foi uma jornada de aprendizagem profunda, cobrindo desde o desenvolvimento frontend e backend até à arquitetura e implantação de serviços na nuvem.

✨ Funcionalidades Principais
Visualização Dupla: Interface alternável entre um quadro Kanban tradicional e uma visualização em lista.

CRUD Completo: Funcionalidade completa para Criar, Ler, Atualizar e Excluir tarefas.

Drag-and-Drop: Reordenação intuitiva das tarefas (verticalmente e entre colunas) com a biblioteca SortableJS.

Colaboração em Tempo Real: Todas as alterações são sincronizadas instantaneamente entre todos os utilizadores conectados, utilizando o Azure SignalR Service.

Histórico de Tarefas: Cada tarefa mantém um registo de todas as suas alterações de status e edições.

Integração Externa: Possibilidade de adicionar links para o Azure DevOps em cada tarefa.

Design Responsivo: Interface limpa e funcional, construída com Tailwind CSS.

🚀 Arquitetura e Tecnologias Utilizadas
A aplicação foi construída sobre uma arquitetura serverless moderna, utilizando os seguintes serviços e tecnologias:

Frontend: HTML5, Tailwind CSS, JavaScript (Vanilla JS)

Backend: Azure Functions (Node.js)

Base de Dados: Azure Cosmos DB (NoSQL)

Comunicação em Tempo Real: Azure SignalR Service

Hospedagem e CI/CD: Azure Static Web Apps com integração contínua através do GitHub Actions

🔧 Como Executar Localmente
Para executar o projeto no seu ambiente de desenvolvimento, siga estes passos:

Pré-requisitos:

Node.js e npm

Azure Functions Core Tools (npm install -g azure-functions-core-tools@4)

Azurite (npm install -g azurite)

SWA CLI (npm install -g @azure/static-web-apps-cli)

Clone o repositório:

git clone https://github.com/[SEU-USUARIO]/azure-kanban-app.git
cd azure-kanban-app

Instale as dependências da API:

cd api
npm install
cd ..

Configure as Chaves Locais:

Crie um ficheiro api/local.settings.json.

Adicione as suas strings de conexão do Cosmos DB e do SignalR, obtidas no Portal da Azure.

Inicie os Emuladores:

Num terminal, inicie o emulador de armazenamento:

azurite

Noutro terminal, na pasta raiz do projeto, inicie o emulador do Static Web Apps:

swa start app --api-location api

Abra a Aplicação:

Aceda a http://localhost:4280 no seu navegador.




# Notas de Atualização: Quadro de Tarefas v2.0 - "Melhorias de Usabilidade"
Data: 18 de Julho de 2025

Esta atualização foca-se em enriquecer a aplicação com novas funcionalidades de organização e em melhorar significativamente a experiência do utilizador com base no feedback e nos testes.

✨ Novas Funcionalidades
Novo Estado de Tarefa: "Parado"

Foi adicionada uma nova coluna "Parado" ao quadro Kanban, posicionada entre "A fazer" e "Em Andamento".

As tarefas agora podem ter o estado stopped, permitindo um controlo mais granular do fluxo de trabalho.

Funcionalidade Completa de Projetos

Criação e Associação: Agora é possível associar cada tarefa a um "Projeto". Os utilizadores podem criar novos projetos ou selecionar um já existente a partir de uma lista de sugestões.

Nomenclatura Automática: Os nomes dos projetos são automaticamente formatados com um # no início (ex: #ProjetoAlpha) para manter a consistência.

Cores Personalizadas: Cada projeto pode ter uma cor associada, escolhida através de um seletor de cores, que é guardada e reutilizada.

Visualização: O nome do projeto e a sua cor são agora exibidos como uma tag visual nos cartões do Kanban e numa nova coluna na vista em lista.

Sugestões para o Campo "Responsável"

O campo "Responsável" no formulário de criação/edição de tarefas agora sugere nomes de responsáveis que já foram utilizados noutras tarefas, agilizando o preenchimento e evitando erros de digitação.

🛠️ Melhorias e Correções de Bugs
Indicador de Carregamento Inicial

Foi adicionada uma animação de "Carregando..." que é exibida enquanto a aplicação busca os dados iniciais da API, melhorando a percepção de desempenho na primeira vez que a página é carregada.

Ajuste de Cor do Botão de Aprovação

A cor do botão de "Aprovar e Arquivar" (na coluna "Em Homologação") foi alterada de verde para amarelo, para melhor representar um estado de revisão/atenção.

Correção de Ícones na Vista em Lista

Foi corrigido um bug onde os ícones de ação (informação, link, excluir) não estavam a ser exibidos na vista em lista.

Correção do Destaque Visual Persistente

Foi corrigido um bug onde o destaque visual de uma tarefa permanecia ativo de forma incorreta na vista Kanban após a visualização dos seus detalhes, sendo reaplicado em ações subsequentes. A lógica de destaque foi refatorada para ser mais precisa e intencional.
