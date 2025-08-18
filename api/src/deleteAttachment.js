const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');

const connectionString = process.env.AzureWebJobsStorage;
const containerName = 'attachments';

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

app.http('deleteAttachment', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'tasks/attachments/{blobName}',
    handler: async (request, context) => {
        const blobName = request.params.blobName;
        context.log(`HTTP trigger for deleting blob: ${blobName}`);

        if (!blobName) {
            return { status: 400, body: "Nome do blob não fornecido." };
        }

        try {
            const containerClient = blobServiceClient.getContainerClient(containerName);
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);

            const response = await blockBlobClient.delete();

            context.log(`Blob ${blobName} eliminado com sucesso.`);
            return { status: 204 }; // 204 No Content - sucesso sem corpo de resposta

        } catch (error) {
            if (error.statusCode === 404) {
                context.log.warn(`Blob ${blobName} não encontrado. Pode já ter sido eliminado.`);
                return { status: 204 }; // Mesmo que não encontre, a operação de remoção está "concluída"
            }
            context.log.error(`Erro ao eliminar o blob ${blobName}: ${error.message}`);
            return { status: 500, body: "Erro ao eliminar o anexo." };
        }
    }
});