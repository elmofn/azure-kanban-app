const { CosmosClient } = require("@azure/cosmos");

const connectionString = process.env.CosmosDB;
const client = new CosmosClient(connectionString);
const database = client.database("TasksDB");
const container = database.container("Tasks");

module.exports = async function (context, req) {
    const taskId = context.bindingData.id;
    
    try {
        const { resource: existingTask } = await container.item(taskId, taskId).read();
        if (!existingTask) {
            context.res = { status: 404, body: "Tarefa não encontrada." };
            return;
        }

        // Obtém os nomes dos responsáveis
        const responsibleNames = existingTask.responsible.map(r => (typeof r === 'object' ? r.name : r));
        
        if (!responsibleNames || responsibleNames.length === 0) {
            context.res = { status: 400, body: "Esta tarefa não tem responsáveis para sinalizar." };
            return;
        }

        // Inicializa ou atualiza o array de alertas pendentes
        const currentAlerts = existingTask.pendingAlerts || [];
        // Adiciona apenas quem ainda não está na lista
        const newAlerts = [...new Set([...currentAlerts, ...responsibleNames])];

        existingTask.pendingAlerts = newAlerts;

        const { resource: replaced } = await container.item(taskId, taskId).replace(existingTask);

        // Dispara o SignalR para atualizar todos os clientes
        context.bindings.signalRMessage = {
            target: 'taskUpdated',
            arguments: [replaced]
        };

        context.res = { body: replaced };
    } catch (error) {
        context.log.error(`Erro ao sinalizar tarefa: ${error.message}`);
        context.res = { status: 500, body: "Erro interno." };
    }
};