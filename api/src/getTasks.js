const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const connectionString = process.env.CosmosDB;
const client = new CosmosClient(connectionString);
const database = client.database("TasksDB");
const container = database.container("Tasks");

app.http('getTasks', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('HTTP trigger function: Buscando tarefas ativas.');

        try {
            // Garante que o banco de dados e o contêiner existam
            await client.databases.createIfNotExists({ id: "TasksDB" });
            await database.containers.createIfNotExists({ id: "Tasks", partitionKey: { paths: ["/id"] } });

            // Agora a consulta busca todas as tarefas ONDE o status for diferente de 'done'
            const querySpec = {
                query: "SELECT * FROM c WHERE c.status <> @status",
                parameters: [
                    { name: "@status", value: "done" }
                ]
            };

            const { resources: items } = await container.items.query(querySpec).fetchAll();
            return { jsonBody: items };
        } catch (error) {
            // --- CORREÇÃO AQUI ---
            // Trocamos 'context.log.error' por 'context.error'
            context.error(`Erro ao buscar tarefas: ${error.message}`); 
            return { status: 500, body: "Erro ao buscar tarefas." };
        }
    }
});