const { InteractionType, InteractionResponseType, verifyKey } = require('discord-interactions');
const { CosmosClient } = require("@azure/cosmos");

const connectionString = process.env.CosmosDB;
const client = new CosmosClient(connectionString);
const database = client.database("TasksDB");
const container = database.container("Tasks");

function getRequestRawBody(req) {
    if (req.rawBody && req.rawBody.length > 0) return req.rawBody;
    return JSON.stringify(req.body);
}

module.exports = async function (context, req) {
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];
    const rawBody = getRequestRawBody(req);
    const publicKey = process.env.DISCORD_PUBLIC_KEY;
    const appId = process.env.DISCORD_APP_ID; // Adicionado para verificação

    // Log de diagnóstico para as variáveis de ambiente
    if (!appId) {
        context.log.error("ERRO: A variável de ambiente DISCORD_APP_ID está em falta!");
    }

    const isValidRequest = verifyKey(rawBody, signature, timestamp, publicKey);
    if (!isValidRequest) {
        return { status: 401, body: 'Assinatura inválida.' };
    }

    const interaction = req.body;

    if (interaction.type === InteractionType.PING) {
        return { headers: { 'Content-Type': 'application/json' }, body: { type: InteractionResponseType.PONG }};
    }

    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
        context.res = {
            headers: { 'Content-Type': 'application/json' },
            body: { type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE }
        };

        try {
            const commandName = interaction.data.name;
            let responseContent;

            if (commandName === 'novatarefa') {
                responseContent = await handleCreateTask(interaction);
            } else {
                responseContent = 'Comando desconhecido.';
            }

            const followUpUrl = `https://discord.com/api/v10/webhooks/${appId}/${interaction.token}/messages/@original`;
            context.log(`A enviar a resposta final para: ${followUpUrl}`); // Log do URL

            const response = await fetch(followUpUrl, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: responseContent }),
            });

            if (!response.ok) {
                context.log.error(`Erro ao enviar a resposta final para o Discord: ${response.status}`, await response.json());
            } else {
                context.log('Resposta final enviada com sucesso.');
            }

        } catch (error) {
            context.log.error('Erro geral ao executar o comando:', error);
        }
    }
};

async function handleCreateTask(interaction) {
    const options = interaction.data.options;
    const title = options.find(opt => opt.name === 'titulo').value;
    const description = options.find(opt => opt.name === 'descricao').value;
    const project = options.find(opt => opt.name === 'projeto')?.value || '';
    const discordUser = interaction.member.user;

    const operations = [{ op: 'incr', path: '/currentId', value: 1 }];
    const { resource: updatedCounter } = await container.item("taskCounter", "taskCounter").patch(operations);
    const newTaskId = `TC-${String(updatedCounter.currentId).padStart(3, '0')}`;
    
    const newTask = {
        id: newTaskId,
        numericId: updatedCounter.currentId,
        title: title,
        description: description,
        responsible: [{ name: 'DEFINIR', email: '', picture: '' }],
        azureLink: '',
        project: project,
        projectColor: '#526D82',
        priority: 'Média',
        status: 'todo',
        createdAt: new Date().toISOString(),
        createdBy: `${discordUser.username}`,
        history: [{ status: 'todo', timestamp: new Date().toISOString() }],
        order: -Date.now(),
        dueDate: null,
        attachments: []
    };
    
    await container.items.create(newTask);
    return `✅ Tarefa **${newTask.id}: ${newTask.title}** criada com sucesso!`;
}