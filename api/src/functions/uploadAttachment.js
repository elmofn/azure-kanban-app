const { app, output } = require('@azure/functions');
const { BlobServiceClient } = require("@azure/storage-blob");
const { CosmosClient } = require("@azure/cosmos");

const storageConnectionString = process.env.AzureWebJobsStorage;
const cosmosConnectionString = process.env.CosmosDB;

const cosmosClient = new CosmosClient(cosmosConnectionString);
const database = cosmosClient.database("TasksDB");
const container = database.container("Tasks");

const signalROutput = output.generic({
    type: 'signalR',
    name: 'signalRMessage',
    hubName: 'tasks',
    connectionStringSetting: 'AzureSignalRConnectionString',
});

app.http('uploadAttachment', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'uploadAttachment/{id}',
    extraOutputs: [signalROutput],
    handler: async (request, context) => {
        const taskId = request.params.id;
        context.log(`HTTP trigger function: Upload de anexo para a tarefa ${taskId}`);

        try {
            const { resource: task } = await container.item(taskId, taskId).read();
            if (!task) {
                return { status: 404, body: "Tarefa não encontrada." };
            }

            const formData = await request.formData();
            const file = formData.get('file');

            if (!file) {
                return { status: 400, body: "Nenhum ficheiro enviado." };
            }

            const blobServiceClient = BlobServiceClient.fromConnectionString(storageConnectionString);
            const containerClient = blobServiceClient.getContainerClient('attachments');
            await containerClient.createIfNotExists();

            const blobName = `${taskId}-${file.name}`;
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);

            // CORREÇÃO: Converte o ficheiro para um ArrayBuffer e depois para um Buffer do Node.js
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Usa o método .upload() com o buffer, que é mais robusto
            await blockBlobClient.upload(buffer, buffer.length);

            const newAttachment = {
                name: file.name,
                url: blockBlobClient.url,
                uploadedAt: new Date().toISOString()
            };

            if (!Array.isArray(task.attachments)) {
                task.attachments = [];
            }
            task.attachments.push(newAttachment);

            await container.item(taskId, taskId).replace(task);

            context.extraOutputs.set(signalROutput, { target: 'tasksUpdated', arguments: [] });
            return { status: 200, body: "Anexo carregado com sucesso." };

        } catch (error) {
            context.log(`Erro ao carregar anexo: ${error.message}`);
            return { status: 500, body: "Erro ao processar o anexo." };
        }
    }
});