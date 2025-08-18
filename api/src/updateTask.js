const { app, output } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const connectionString = process.env.CosmosDB;
const client = new CosmosClient(connectionString);
const database = client.database("TasksDB");
const container = database.container("Tasks");

const signalROutput = output.generic({
    type: 'signalR',
    direction: 'out',
    name: 'signalR',
    hubName: 'tasks',
    connectionStringSetting: 'AzureSignalRConnectionString',
});

app.http('updateTask', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'updateTask/{id}',
    extraOutputs: [signalROutput],
    handler: async (request, context) => {
        const taskId = request.params.id;
        const updatedData = await request.json();
        context.log(`A atualizar tarefa com ID: ${taskId}`);

        try {
            const { resource: existingTask } = await container.item(taskId, taskId).read();
            if (!existingTask) {
                return { status: 404, body: "Tarefa não encontrada." };
            }

            if (updatedData.responsible && typeof updatedData.responsible === 'string') {
                updatedData.responsible = updatedData.responsible.split(',').map(name => name.trim());
            } else if (Object.keys(updatedData).some(key => key !== 'status')) {
                if (!existingTask.history) existingTask.history = [];
                existingTask.history.push({ status: 'edited', timestamp: new Date().toISOString() });
            }

            // NOVO: Garante que os anexos sejam sempre um array
            if (updatedData.attachments && !Array.isArray(updatedData.attachments)) {
                updatedData.attachments = [];
            }

            const taskToUpdate = { ...existingTask, ...updatedData };
            const { resource: replaced } = await container.item(taskId, taskId).replace(taskToUpdate);
            
            context.extraOutputs.set(signalROutput, {
                target: 'taskUpdated',
                arguments: [replaced]
            });
            return { jsonBody: replaced };
        } catch (error) {
            context.log.error(`Erro ao atualizar tarefa ${taskId}: ${error.message}`);
            return { status: 500, body: "Erro ao atualizar tarefa." };
        }
    }
});