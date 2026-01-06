const { InteractionType, InteractionResponseType, verifyKey } = require('discord-interactions');
const { CosmosClient } = require("@azure/cosmos");

// --- Configuração do Cosmos DB ---
const connectionString = process.env.CosmosDB;
const client = new CosmosClient(connectionString);
const database = client.database("TasksDB");
const tasksContainer = database.container("Tasks"); 
const usersContainer = database.container("Users");

function getRequestRawBody(req) {
    if (req.rawBody && req.rawBody.length > 0) return req.rawBody;
    return JSON.stringify(req.body);
}

// --- Função Principal ---
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

    // --- Lógica de Autocomplete (Mantida) ---
    if (interaction.type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE) {
        const focusedOption = interaction.data.options.find(opt => opt.focused);
        let choices = [];

        try {
            if (focusedOption.name === 'projeto') {
                const { resources: tasks } = await tasksContainer.items.query("SELECT DISTINCT c.project FROM c WHERE c.project != null AND c.project != ''").fetchAll();
                const allProjects = [...new Set(tasks.map(t => t.project))];
                choices = allProjects
                    .filter(p => p.toLowerCase().startsWith(focusedOption.value.toLowerCase()))
                    .map(p => ({ name: p, value: p }));
            }

            if (focusedOption.name === 'responsavel') {
                const { resources: users } = await usersContainer.items.readAll().fetchAll();
                choices = users
                    .filter(u => u.name.toLowerCase().includes(focusedOption.value.toLowerCase()) && u.name !== 'DEFINIR')
                    .map(u => ({ name: u.name, value: u.name }));
            }

            context.res = {
                headers: { 'Content-Type': 'application/json' },
                body: {
                    type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
                    data: { choices: choices.slice(0, 25) }
                }
            };

        } catch (error) {
            context.log.error("Erro no autocomplete:", error);
            context.res = {
                 headers: { 'Content-Type': 'application/json' },
                 body: {
                    type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
                    data: { choices: [] }
                }
            }
        }
        return;
    }

    if (interaction.type === InteractionType.PING) {
        return { headers: { 'Content-Type': 'application/json' }, body: { type: InteractionResponseType.PONG }};
    }

    // --- Lógica de Comandos ---
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
        try {
            const commandName = interaction.data.name;
            let responsePayload;

            // Processa a lógica de cada comando
            if (commandName === 'ping') {
                responsePayload = { content: 'Pong! A ligação está perfeita.' };
            } else if (commandName === 'taquasepronto') {
                responsePayload = { content: 'Tu disse que precisava de mais 2 horas pra terminar e depois de dois dias tu diz que ta quase pronto?????????????' };
            } else if (commandName === 'novatarefa') {
                responsePayload = await handleCreateTask(interaction, context);
            } else {
                responsePayload = { content: 'Comando desconhecido.' };
            }

            // Envia a resposta final DIRETAMENTE (Tipo 4)
            context.res = {
                headers: { 'Content-Type': 'application/json' },
                body: {
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: responsePayload
                }
            };

        } catch (error) {
            context.log.error('Erro ao executar o comando:', error);
            context.res = {
                headers: { 'Content-Type': 'application/json' },
                body: {
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: { content: '❌ Ocorreu um erro ao processar o seu comando.' }
                }
            };
        }
    }
};

// --- Função Auxiliar handleCreateTask (Mantida) ---
async function handleCreateTask(interaction, context) {
    const options = interaction.data.options;
    const title = options.find(opt => opt.name === 'titulo').value;
    const description = options.find(opt => opt.name === 'descricao').value;
    const responsibleName = options.find(opt => opt.name === 'responsavel').value;
    const project = options.find(opt => opt.name === 'projeto')?.value || 'Geral';
    const discordUser = interaction.member.user;

    const { resources: allUsers } = await usersContainer.items.readAll().fetchAll();
    const responsibleUser = allUsers.find(u => u.name === responsibleName);

    if (!responsibleUser) {
        context.log.warn(`Responsável "${responsibleName}" não encontrado na base de dados.`);
        return { content: `❌ Não foi possível encontrar o responsável "${responsibleName}" no quadro de tarefas. Por favor, selecione um utilizador da lista.` };
    }

    const operations = [{ op: 'incr', path: '/currentId', value: 1 }];
    const { resource: updatedCounter } = await tasksContainer.item("taskCounter", "taskCounter").patch(operations);
    const newTaskId = `TC-${String(updatedCounter.currentId).padStart(3, '0')}`;
    
    const newTask = {
        id: newTaskId,
        numericId: updatedCounter.currentId,
        title: title,
        description: description,
        responsible: [responsibleUser],
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
    
    await tasksContainer.items.create(newTask);
    context.log(`Tarefa ${newTask.id} criada com sucesso.`);

    return {
        content: `✅ Tarefa **${newTask.id}** criada com sucesso!`,
        embeds: [
            {
                title: `[${newTask.id}] ${newTask.title}`,
                description: newTask.description,
                color: parseInt("526D82", 16),
                fields: [
                    { name: "Projeto", value: newTask.project, inline: true },
                    { name: "Responsável", value: responsibleUser.name, inline: true },
                    { name: "Prioridade", value: newTask.priority, inline: true },
                ],
                footer: { text: `Criado por: ${discordUser.username}` },
                timestamp: new Date().toISOString()
            }
        ]
    };
}