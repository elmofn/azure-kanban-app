const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const connectionString = process.env.CosmosDB;
const client = new CosmosClient(connectionString);
const database = client.database("TasksDB");
const container = database.container("Tasks");

app.http('updateTask', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'updateTask/{id}',
    handler: async (request, context) => {
        const taskId = request.params.id;
        const updatedData = await request.json();
        context.log(`HTTP trigger function: A atualizar tarefa com ID: ${taskId}`);

        try {
            // Primeiro, busca o item existente
            const { resource: existingTask } = await container.item(taskId, taskId).read();

            if (!existingTask) {
                return { status: 404, body: "Tarefa não encontrada." };
            }

            // Adiciona um novo registo ao histórico se o status mudou
            if (updatedData.status && updatedData.status !== existingTask.status) {
                existingTask.history.push({
                    status: updatedData.status,
                    timestamp: new Date().toISOString()
                });
            }

            // Mescla os dados existentes com os novos dados recebidos
            const taskToUpdate = { ...existingTask, ...updatedData };

            // Salva o item atualizado
            const { resource: replaced } = await container.item(taskId, taskId).replace(taskToUpdate);

            return { jsonBody: replaced };

        } catch (error) {
            context.log.error(`Erro ao atualizar tarefa ${taskId}: ${error.message}`);
            return { status: 500, body: "Erro ao atualizar tarefa." };
        }
    }
});