const { BlobServiceClient } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');

const connectionString = process.env.AzureWebJobsStorage; 
const containerName = 'attachments';

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

module.exports = async function (context, req) {
    context.log('HTTP trigger for attachment upload.');

    try {
        const formData = await req.formData();
        const file = formData.get('file');

        if (!file) {
            context.res = { status: 400, body: 'Nenhum arquivo enviado.' };
            return;
        }

        const blobName = `${uuidv4()}-${file.name}`;
        const containerClient = blobServiceClient.getContainerClient(containerName);
        await containerClient.createIfNotExists({ access: 'blob' });
        
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await blockBlobClient.uploadData(buffer, {
            blobHTTPHeaders: { blobContentType: file.type }
        });

        context.log(`Arquivo ${blobName} enviado com sucesso.`);

        context.res = {
            body: {
                url: blockBlobClient.url,
                name: file.name,
                contentType: file.type,
            }
        };

    } catch (error) {
        context.log.error(`Erro no upload: ${error.message}`);
        context.res = { status: 500, body: 'Erro ao processar o arquivo.' };
    }
};