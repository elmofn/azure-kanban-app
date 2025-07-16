const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

// Lê a string de conexão diretamente das configurações do ambiente
const connectionString = process.env.CosmosDB;

// Validação para garantir que a string de conexão foi encontrada
if (!connectionString) {
    throw new Error("A variável de ambiente 'CosmosDB' com a string de conexão não foi encontrada.");
}

const client = new CosmosClient(connectionString);
const databaseId = "TasksDB";
const containerId = "Tasks";

app.http('getTasks', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('HTTP trigger function: Buscando tarefas manualmente.');

        try {
            const database = client.database(databaseId);
            const container = database.container(containerId);

            // Garante que o banco de dados e o contêiner existam
            await client.databases.createIfNotExists({ id: databaseId });
            await database.containers.createIfNotExists({ id: containerId });

            const { resources: items } = await container.items
                .query("SELECT * from c")
                .fetchAll();

            context.log(`Encontradas ${items.length} tarefas.`);
            return { jsonBody: items };

        } catch (error) {
            context.log.error(`Erro ao buscar tarefas: ${error.message}`);
            return { status: 500, body: "Erro ao buscar tarefas do banco de dados." };
        }
    }
});