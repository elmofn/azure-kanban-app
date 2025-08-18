const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');

// String de conexão para o Azure Blob Storage
const connectionString = process.env.AzureWebJobsStorage; 
const containerName = 'attachments'; // Nome do container onde os arquivos serão salvos

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

app.http('uploadAttachment', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'tasks/attachments',
    handler: async (request, context) => {
        context.log('HTTP trigger for attachment upload.');

        try {
            // Usa o método nativo para processar o formulário com arquivos
            const formData = await request.formData();
            
            // Pega o arquivo pelo nome do campo ('file')
            const file = formData.get('file');

            if (!file) {
                return { status: 400, body: 'Nenhum arquivo enviado.' };
            }

            const blobName = `${uuidv4()}-${file.name}`;
            const containerClient = blobServiceClient.getContainerClient(containerName);
            await containerClient.createIfNotExists({ access: 'blob' }); // Garante que o container exista
            
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);

            // Converte o arquivo para um buffer para fazer o upload
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Faz o upload do buffer do arquivo para o Blob Storage
            await blockBlobClient.uploadData(buffer, {
                blobHTTPHeaders: { blobContentType: file.type }
            });

            context.log(`Arquivo ${blobName} enviado com sucesso.`);

            // Retorna a URL do arquivo para o frontend
            return {
                jsonBody: {
                    url: blockBlobClient.url,
                    name: file.name,
                    contentType: file.type,
                }
            };

        } catch (error) {
            context.log.error(`Erro no upload: ${error.message}`);
            return { status: 500, body: 'Erro ao processar o arquivo.' };
        }
    }
});