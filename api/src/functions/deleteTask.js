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

app.http('deleteTask', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'deleteTask/{id}',
    extraOutputs: [signalROutput],
    handler: async (request, context) => {
        const taskId = request.params.id;
        context.log(`HTTP trigger function: A excluir tarefa com ID: ${taskId}`);
        try {
            await container.item(taskId, taskId).delete();
            context.extraOutputs.set(signalROutput, {
                target: 'tasksUpdated',
                arguments: []
            });
            return { status: 204 };
        } catch (error) {
            if (error.code === 404) {
                return { status: 404, body: "Tarefa não encontrada." };
            }
            context.log.error(`Erro ao excluir tarefa ${taskId}: ${error.message}`);
            return { status: 500, body: "Erro ao excluir tarefa." };
        }
    }
});