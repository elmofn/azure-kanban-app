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

app.http('updateProjectColor', {
    methods: ['POST'],
    authLevel: 'anonymous',
    extraOutputs: [signalROutput],
    handler: async (request, context) => {
        const { projectName, newColor } = await request.json();
        context.log(`Atualizando a cor do projeto '${projectName}' para '${newColor}'.`);

        if (!projectName || !newColor) {
            return { status: 400, body: "Nome do projeto e nova cor são obrigatórios." };
        }

        try {
            // 1. Encontra todas as tarefas com o nome do projeto
            const querySpec = {
                query: "SELECT * FROM c WHERE c.project = @projectName",
                parameters: [{ name: "@projectName", value: projectName }]
            };
            const { resources: tasksToUpdate } = await container.items.query(querySpec).fetchAll();

            if (tasksToUpdate.length === 0) {
                return { status: 200, body: "Nenhuma tarefa encontrada para este projeto." };
            }

            // 2. Prepara as operações de patch em massa
            const operations = tasksToUpdate.map(task => ({
                operationType: "Patch",
                id: task.id,
                partitionKey: task.id,
                resourceBody: {
                    operations: [{ op: "set", path: "/projectColor", value: newColor }]
                }
            }));
            
            // 3. Executa as operações em lotes de 100
            while (operations.length > 0) {
                const batch = operations.splice(0, 100);
                await container.items.bulk(batch);
                context.log(`Lote de ${batch.length} tarefas atualizado.`);
            }

            // 4. Notifica os clientes para recarregarem os dados
            context.extraOutputs.set(signalROutput, {
                target: 'tasksReordered', // Reutilizando o evento que força o refresh
                arguments: []
            });

            return { status: 200, body: `Cor do projeto '${projectName}' atualizada com sucesso.` };
        } catch (error) {
            context.log.error(`Erro ao atualizar cor do projeto: ${error.message}`);
            return { status: 500, body: "Erro interno ao atualizar a cor do projeto." };
        }
    }
});