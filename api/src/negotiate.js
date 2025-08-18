const { app, input } = require('@azure/functions');

// Define a entrada de informações de conexão do SignalR
const signalRConnectionInfoInput = input.generic({
    type: 'signalRConnectionInfo',
    direction: 'in',
    name: 'connectionInfo',
    hubName: 'tasks',
    connectionStringSetting: 'AzureSignalRConnectionString',
});

// Configura a função HTTP para lidar com a negociação
app.http('negotiate', {
    methods: ['POST', 'GET'], // Aceita GET para testes no navegador e POST para o cliente real
    authLevel: 'anonymous',
    // CORREÇÃO: Usa 'extraInputs' para entradas adicionais no modelo v4
    extraInputs: [signalRConnectionInfoInput],
    handler: (request, context) => {
        // Retorna as informações de conexão obtidas pela extensão do SignalR
        return {
            jsonBody: context.extraInputs.get(signalRConnectionInfoInput)
        };
    }
});