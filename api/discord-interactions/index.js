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

    // Lidar com o novo evento de Autocomplete
    if (interaction.type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE) {
        const focusedOption = interaction.data.options.find(opt => opt.focused);
        
        if (focusedOption.name === 'projeto') {
            // Obter os projetos existentes da base de dados
            const { resources: tasks } = await tasksContainer.items.query("SELECT DISTINCT c.project FROM c WHERE c.project != null AND c.project != ''").fetchAll();
            const allProjects = [...new Set(tasks.map(t => t.project))];

            // Filtrar os projetos com base no que o utilizador digitou
            const filteredProjects = allProjects
                .filter(p => p.toLowerCase().startsWith(focusedOption.value.toLowerCase()))
                .slice(0, 25); // O Discord tem um limite de 25 opções

            context.res = {
                headers: { 'Content-Type': 'application/json' },
                body: {
                    type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
                    data: {
                        choices: filteredProjects.map(p => ({ name: p, value: p })),
                    }
                }
            };
        }
        return;
    }

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

            if (commandName === 'ping') {
                responseContent = 'Pong! A ligação está perfeita.';
            } else if (commandName === 'novatarefa') {
                responseContent = await handleCreateTask(interaction);
            } else {
                responseContent = 'Comando desconhecido.';
            }

            const followUpUrl = `https://discord.com/api/v10/webhooks/${process.env.DISCORD_APP_ID}/${interaction.token}/messages/@original`;
            await fetch(followUpUrl, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: responseContent }),
            });

        } catch (error) {
            context.log.error('Erro ao executar o comando:', error);
            const followUpUrl = `https://discord.com/api/v10/webhooks/${process.env.DISCORD_APP_ID}/${interaction.token}/messages/@original`;
            await fetch(followUpUrl, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: '❌ Ocorreu um erro ao processar o seu comando.' }),
            });
        }
    }
};

// --- Lógica do Comando /novatarefa atualizada ---
async function handleCreateTask(interaction) {
    const options = interaction.data.options;
    const title = options.find(opt => opt.name === 'titulo').value;
    const description = options.find(opt => opt.name === 'descricao').value;
    const responsibleUserId = options.find(opt => opt.name === 'responsavel').value;
    const project = options.find(opt => opt.name === 'projeto')?.value || '';
    const discordUser = interaction.member.user;

    // Encontrar o utilizador correspondente na nossa base de dados
    const { resources: allUsers } = await usersContainer.items.readAll().fetchAll();
    const responsibleUser = allUsers.find(u => u.name.toLowerCase().includes(interaction.data.resolved.users[responsibleUserId].username.toLowerCase()));

    const operations = [{ op: 'incr', path: '/currentId', value: 1 }];
    const { resource: updatedCounter } = await container.item("taskCounter", "taskCounter").patch(operations);
    const newTaskId = `TC-${String(updatedCounter.currentId).padStart(3, '0')}`;
    
    const newTask = {
        id: newTaskId,
        numericId: updatedCounter.currentId,
        title: title,
        description: description,
        responsible: responsibleUser ? [responsibleUser] : [{ name: 'DEFINIR', email: '', picture: '' }],
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
    return `✅ Tarefa **${newTask.id}: ${newTask.title}** criada e atribuída a **${responsibleUser ? responsibleUser.name : 'DEFINIR'}**!`;
}