const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const connectionString = process.env.CosmosDB;
const client = new CosmosClient(connectionString);
const database = client.database("TasksDB");
const container = database.container("Users"); // Aponta para a nossa nova coleção

app.http('getUsers', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('HTTP trigger function: Buscando lista de usuários da coleção Users.');

        try {
            // Garante que a coleção Users exista
            await database.containers.createIfNotExists({ id: "Users", partitionKey: { paths: ["/email"] } });

            // Simplesmente lê todos os documentos da coleção Users
            const { resources: users } = await container.items.readAll().fetchAll();
            
            // Adiciona a opção "DEFINIR" à lista
            if (!users.some(u => u.name === 'DEFINIR')) {
                 users.push({ name: 'DEFINIR', email: '', picture: '' });
            }

            return { jsonBody: users };
        } catch (error) {
            context.error(`Erro ao buscar usuários: ${error.message}`); 
            return { status: 500, body: "Erro ao buscar usuários." };
        }
    }
});