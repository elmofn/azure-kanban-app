const { InteractionType, InteractionResponseType, verifyKey } = require('discord-interactions');
const { CosmosClient } = require("@azure/cosmos");

const connectionString = process.env.CosmosDB;
const client = new CosmosClient(connectionString);
const database = client.database("TasksDB");
const tasksContainer = database.container("Tasks");
const usersContainer = database.container("Users");

function getRequestRawBody(req) {
    if (req.rawBody && req.rawBody.length > 0) return req.rawBody;
    return JSON.stringify(req.body);
}

module.exports = async function (context, req) {
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];
    const rawBody = getRequestRawBody(req);
    const publicKey = process.env.DISCORD_PUBLIC_KEY;

    const isValidRequest = verifyKey(rawBody, signature, timestamp, publicKey);
    if (!isValidRequest) {
        return { status: 401, body: 'Assinatura inválida.' };
    }

    const interaction = req.body;

    // Lidar com eventos de Autocomplete com DADOS FALSOS PARA TESTE
    if (interaction.type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE) {
        const focusedOption = interaction.data.options.find(opt => opt.focused);
        let choices = [];

        if (focusedOption.name === 'projeto') {
            choices = [
                { name: 'Projeto Teste A (Falso)', value: 'Projeto Teste A (Falso)' },
                { name: 'Projeto Teste B (Falso)', value: 'Projeto Teste B (Falso)' }
            ];
        }

        if (focusedOption.name === 'responsavel') {
            choices = [
                { name: 'Utilizador Falso 1', value: 'Utilizador Falso 1' },
                { name: 'Utilizador Falso 2', value: 'Utilizador Falso 2' }
            ];
        }

        // Filtra os dados falsos para simular a experiência de escrita
        const filteredChoices = choices.filter(c => c.name.toLowerCase().startsWith(focusedOption.value.toLowerCase()));

        return {
            headers: { 'Content-Type': 'application/json' },
            body: {
                type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
                data: { choices: filteredChoices.slice(0, 25) }
            }
        };
    }

    if (interaction.type === InteractionType.PING) {
        return { headers: { 'Content-Type': 'application/json' }, body: { type: InteractionResponseType.PONG }};
    }

    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
        // A lógica de criação de tarefas está desativada para este teste
        return {
             headers: { 'Content-Type': 'application/json' },
             body: {
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: "O autocompletar funcionou! A criação de tarefas está temporariamente desativada para este teste." }
            }
        }
    }
};