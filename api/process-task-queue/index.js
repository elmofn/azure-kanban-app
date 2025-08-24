const { CosmosClient } = require("@azure/cosmos");

const connectionString = process.env.CosmosDB;
const client = new CosmosClient(connectionString);
const database = client.database("TasksDB");
const tasksContainer = database.container("Tasks");
const usersContainer = database.container("Users");

module.exports = async function (context, queueItem) {
    context.log('A processar um item da fila para criar uma nova tarefa.');

    const { interaction, responsibleName, project } = queueItem;
    const { title, description } = interaction.data.options.reduce((acc, opt) => {
        acc[opt.name] = opt.value;
        return acc;
    }, {});
    
    const discordUser = interaction.member.user;

    try {
        const { resources: allUsers } = await usersContainer.items.readAll().fetchAll();
        const responsibleUser = allUsers.find(u => u.name === responsibleName);

        if (!responsibleUser) {
            throw new Error(`Responsável "${responsibleName}" não encontrado.`);
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
            project: project || 'Geral',
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

        const responsePayload = {
            content: `✅ Tarefa **${newTask.id}** criada com sucesso!`,
            embeds: [{
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
            }]
        };
        
        const followUpUrl = `https://discord.com/api/v10/webhooks/${process.env.DISCORD_APP_ID}/${interaction.token}/messages/@original`;
        await fetch(followUpUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(responsePayload),
        });

    } catch (error) {
        context.log.error('Erro ao processar a criação da tarefa na fila:', error);
        const followUpUrl = `https://discord.com/api/v10/webhooks/${process.env.DISCORD_APP_ID}/${interaction.token}/messages/@original`;
        await fetch(followUpUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: `❌ Ocorreu um erro ao criar a tarefa: ${error.message}` }),
        });
    }
};