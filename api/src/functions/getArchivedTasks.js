const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const connectionString = process.env.CosmosDB;
const client = new CosmosClient(connectionString);
const database = client.database("TasksDB");
const container = database.container("Tasks");

app.http('getArchivedTasks', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('HTTP trigger function: Buscando tarefas ARQUIVADAS.');

        try {
            const querySpec = {
                query: "SELECT * FROM c WHERE c.status = @status",
                parameters: [
                    { name: "@status", value: "done" }
                ]
            };

            const { resources: items } = await container.items.query(querySpec).fetchAll();
            return { jsonBody: items };
        } catch (error) {
            context.error(`Erro ao buscar tarefas arquivadas: ${error.message}`);
            return { status: 500, body: "Erro ao buscar tarefas arquivadas." };
        }
    }
});