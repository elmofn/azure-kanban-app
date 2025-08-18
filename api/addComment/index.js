const { CosmosClient } = require("@azure/cosmos");

const connectionString = process.env.CosmosDB;
const client = new CosmosClient(connectionString);
const database = client.database("TasksDB");
const container = database.container("Tasks");

// Função auxiliar para obter o usuário
function getUser(req) {
    const header = req.headers['x-ms-client-principal'];
    if (!header) return null;
    const encoded = Buffer.from(header, 'base64');
    const decoded = encoded.toString('ascii');
    return JSON.parse(decoded);
}

module.exports = async function (context, req) {
    const user = getUser(req);
    if (!user) {
        context.res = { status: 401, body: "Acesso não autorizado." };
        return;
    }

    const taskId = req.params.id;
    const commentData = req.body;
    context.log(`HTTP trigger function: Adicionando comentário à tarefa com ID: ${taskId}`);

    try {
        const { resource: existingTask } = await container.item(taskId, taskId).read();
        if (!existingTask) {
            context.res = { status: 404, body: "Tarefa não encontrada." };
            return;
        }

        const newComment = {
            text: commentData.text,
            author: user.userDetails,
            userId: user.userId, 
            timestamp: new Date().toISOString()
        };

        if (!Array.isArray(existingTask.comments)) {
            existingTask.comments = [];
        }
        existingTask.comments.push(newComment);

        const { resource: replaced } = await container.item(taskId, taskId).replace(existingTask);

        context.bindings.signalRMessage = {
            target: 'taskUpdated',
            arguments: [replaced]
        };

        context.res = { body: replaced };

    } catch (error) {
        context.log.error(`Erro ao adicionar comentário: ${error.message}`);
        context.res = { status: 500, body: "Erro ao adicionar comentário." };
    }
};