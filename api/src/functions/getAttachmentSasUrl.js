const { app } = require('@azure/functions');
const { BlobServiceClient, BlobSASPermissions, StorageSharedKeyCredential } = require("@azure/storage-blob");

const storageConnectionString = process.env.AzureWebJobsStorage;

// A forma correta e robusta de criar o cliente de serviço
const blobServiceClient = BlobServiceClient.fromConnectionString(storageConnectionString);

app.http('getAttachmentSasUrl', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'getAttachmentSasUrl/{id}',
    handler: async (request, context) => {
        const taskId = request.params.id;
        const { blobName } = await request.json();
        context.log(`Gerando SAS URL para o blob ${blobName}`);

        try {
            const containerClient = blobServiceClient.getContainerClient('attachments');
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);

            // A lógica para gerar o token SAS permanece a mesma
            const sasToken = await blockBlobClient.generateSasUrl({
                permissions: BlobSASPermissions.parse("r"), // "r" = permissão de leitura (read)
                expiresOn: new Date(new Date().valueOf() + 300 * 1000), // Válido por 5 minutos
            });

            return { jsonBody: { sasUrl: sasToken } };

        } catch (error) {
            context.log(`Erro ao gerar SAS URL: ${error.message}`);
            return { status: 500, body: "Erro ao gerar URL de acesso." };
        }
    }
});