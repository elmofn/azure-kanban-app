const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const connectionString = process.env.CosmosDB;
const client = new CosmosClient(connectionString);
const database = client.database("TasksDB");
const usersContainer = database.container("Users");

// Função para obter os dados do utilizador que está a fazer o pedido
function getUser(request) {
    const header = request.headers.get('x-ms-client-principal');
    if (!header) return null;
    const encoded = Buffer.from(header, 'base64');
    const decoded = encoded.toString('ascii');
    return JSON.parse(decoded);
}

app.http('addUser', {
    methods: ['POST'],
    authLevel: 'anonymous', // A autorização é verificada dentro da função
    handler: async (request, context) => {
        context.log('HTTP trigger function: addUser.');

        const requestingUser = getUser(request);

        // Verificação de segurança: Apenas utilizadores com a role 'admin' podem adicionar outros
        if (!requestingUser || !requestingUser.userRoles.includes('admin')) {
            context.warn(`ACESSO NEGADO: Utilizador ${requestingUser?.userDetails} tentou adicionar um utilizador sem permissão de admin.`);
            return { status: 403, body: "Acesso negado. Apenas administradores podem adicionar utilizadores." };
        }

        try {
            const newUser = await request.json();

            if (!newUser || !newUser.email || !newUser.name) {
                return { status: 400, body: "Nome e e-mail são obrigatórios." };
            }

            const userProfile = {
                id: newUser.email.toLowerCase(),
                email: newUser.email.toLowerCase(),
                name: newUser.name,
                picture: '', // A foto será atualizada no primeiro login do utilizador
                isAdmin: newUser.isAdmin === true // Define se o novo utilizador também é admin
            };

            await usersContainer.items.create(userProfile);
            context.log(`Administrador ${requestingUser.userDetails} adicionou o novo utilizador: ${userProfile.email}`);
            
            return { jsonBody: userProfile };

        } catch (error) {
            if (error.code === 409) { // Conflito, o utilizador já existe
                context.warn(`Tentativa de adicionar um utilizador que já existe: ${error.message}`);
                return { status: 409, body: "Este utilizador já existe na base de dados." };
            }
            context.error(`Erro ao adicionar utilizador: ${error.message}`);
            return { status: 500, body: "Erro ao adicionar o utilizador." };
        }
    }
});