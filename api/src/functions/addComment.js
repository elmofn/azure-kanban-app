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

app.http('addComment', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'addComment/{id}',
    extraOutputs: [signalROutput],
    handler: async (request, context) => {
        const taskId = request.params.id;
        const commentData = await request.json();
        context.log(`HTTP trigger function: Adicionando comentário à tarefa com ID: ${taskId}`);

        try {
            const { resource: existingTask } = await container.item(taskId, taskId).read();
            if (!existingTask) {
                return { status: 404, body: "Tarefa não encontrada." };
            }

            const newComment = {
                text: commentData.text,
                author: commentData.author,
                timestamp: new Date().toISOString()
            };

            // Se o array de comentários não existir, cria-o
            if (!Array.isArray(existingTask.comments)) {
                existingTask.comments = [];
            }
            existingTask.comments.push(newComment);

            const { resource: replaced } = await container.item(taskId, taskId).replace(existingTask);

            context.extraOutputs.set(signalROutput, {
                target: 'tasksUpdated',
                arguments: []
            });

            return { jsonBody: replaced };
        } catch (error) {
            context.log(`Erro ao adicionar comentário: ${error.message}`);
            return { status: 500, body: "Erro ao adicionar comentário." };
        }
    }
});