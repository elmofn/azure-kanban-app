const { CosmosClient } = require("@azure/cosmos");

const connectionString = process.env.CosmosDB;
const client = new CosmosClient(connectionString);
const database = client.database("TasksDB");
const container = database.container("Tasks");

module.exports = async function (context, req) {
    const taskId = context.bindingData.id;
    const updatedData = req.body;
    context.log(`A atualizar tarefa com ID: ${taskId}`);

    try {
        const { resource: existingTask } = await container.item(taskId, taskId).read();
        if (!existingTask) {
            context.res = { status: 404, body: "Tarefa não encontrada." };
            return;
        }

        // Adiciona um registo ao histórico se campos importantes (exceto status) forem alterados
        if (Object.keys(updatedData).some(key => key !== 'status')) {
            if (!existingTask.history) existingTask.history = [];
            existingTask.history.push({ status: 'edited', timestamp: new Date().toISOString() });
        }

        if (updatedData.attachments && !Array.isArray(updatedData.attachments)) {
            updatedData.attachments = [];
        }

        const taskToUpdate = { ...existingTask, ...updatedData };
        const { resource: replaced } = await container.item(taskId, taskId).replace(taskToUpdate);

        context.bindings.signalRMessage = {
            target: 'taskUpdated',
            arguments: [replaced]
        };

        context.res = { body: replaced };
    } catch (error) {
        context.log.error(`Erro ao atualizar tarefa ${taskId}: ${error.message}`);
        context.res = { status: 500, body: "Erro ao atualizar tarefa." };
    }
};