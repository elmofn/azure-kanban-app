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

app.http('updateOrder', {
    methods: ['POST'],
    authLevel: 'anonymous',
    extraOutputs: [signalROutput],
    handler: async (request, context) => {
        const orderedTasks = await request.json();
        context.log(`HTTP trigger function: A atualizar a ordem de ${orderedTasks.length} tarefas.`);

        try {
            const operations = orderedTasks.map(task => ({
                operationType: "Patch",
                id: task.id,
                partitionKey: task.id,
                resourceBody: {
                    operations: [{ op: "set", path: "/order", value: task.order }]
                }
            }));

            await container.items.bulk(operations);

            context.extraOutputs.set(signalROutput, {
                target: 'tasksUpdated',
                arguments: []
            });

            return { status: 200, body: "Ordem atualizada com sucesso." };
        } catch (error) {
            context.log.error(`Erro ao atualizar a ordem: ${error.message}`);
            return { status: 500, body: "Erro ao atualizar a ordem das tarefas." };
        }
    }
});