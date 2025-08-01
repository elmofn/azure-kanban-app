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

app.http('deleteComment', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'deleteComment/{id}',
    extraOutputs: [signalROutput],
    handler: async (request, context) => {
        const taskId = request.params.id;
        const { index } = await request.json();
        context.log(`HTTP trigger function: Excluindo comentário no índice ${index} da tarefa ${taskId}`);

        try {
            const { resource: existingTask } = await container.item(taskId, taskId).read();
            if (!existingTask) {
                return { status: 404, body: "Tarefa não encontrada." };
            }

            if (Array.isArray(existingTask.comments) && existingTask.comments[index]) {
                existingTask.comments.splice(index, 1);
            } else {
                return { status: 400, body: "Comentário não encontrado." };
            }

            const { resource: replaced } = await container.item(taskId, taskId).replace(existingTask);

            context.extraOutputs.set(signalROutput, {
                target: 'tasksUpdated',
                arguments: []
            });

            return { jsonBody: replaced };
        } catch (error) {
            context.log(`Erro ao excluir comentário: ${error.message}`);
            return { status: 500, body: "Erro ao excluir comentário." };
        }
    }
});
