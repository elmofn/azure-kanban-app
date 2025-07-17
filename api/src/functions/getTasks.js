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
        context.log('HTTP trigger function: Buscando tarefas.');

        try {
            // Garante que o banco de dados e o contêiner existam com a chave de partição correta
            await client.databases.createIfNotExists({ id: "TasksDB" });
            await database.containers.createIfNotExists({ id: "Tasks", partitionKey: { paths: ["/id"] } });

            const { resources: items } = await container.items.query("SELECT * from c").fetchAll();
            return { jsonBody: items };
        } catch (error) {
            context.log.error(`Erro ao buscar tarefas: ${error.message}`);
            return { status: 500, body: "Erro ao buscar tarefas." };
        }
    }
});