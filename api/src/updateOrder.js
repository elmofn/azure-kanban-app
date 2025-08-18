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
                partitionKey: task.id, // A chave de partição é o próprio ID da tarefa
                resourceBody: {
                    operations: [{ op: "set", path: "/order", value: task.order }]
                }
            }));

            // --- LÓGICA CORRIGIDA ABAIXO ---

            // Em vez de enviar tudo de uma vez, processamos em lotes de 100.
            while (operations.length > 0) {
                // Pega os primeiros 100 itens da lista (ou menos, se restarem menos de 100)
                const batch = operations.splice(0, 100);
                
                // Envia apenas o lote para o Cosmos DB
                await container.items.bulk(batch);
                
                context.log(`Processado um lote de ${batch.length} operações de reordenação.`);
            }

            context.extraOutputs.set(signalROutput, {
                target: 'tasksReordered',
                arguments: []
            });

            return { status: 200, body: "Ordem atualizada com sucesso." };
        } catch (error) {
            context.log(`Erro ao atualizar a ordem: ${error.message}`);
            return { status: 500, body: "Erro ao atualizar a ordem das tarefas." };
        }
    }
});