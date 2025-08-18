const { CosmosClient } = require("@azure/cosmos");

const connectionString = process.env.CosmosDB;
const client = new CosmosClient(connectionString);
const database = client.database("TasksDB");
const usersContainer = database.container("Users");

// Função para obter os dados do utilizador que está a fazer o pedido
function getUser(req) {
    const header = req.headers['x-ms-client-principal'];
    if (!header) return null;
    const encoded = Buffer.from(header, 'base64');
    const decoded = encoded.toString('ascii');
    return JSON.parse(decoded);
}

module.exports = async function (context, req) {
    context.log('HTTP trigger function: addUser.');

    const requestingUser = getUser(req);

    // Verificação de segurança: Apenas utilizadores com a role 'admin' podem adicionar outros
    if (!requestingUser || !requestingUser.userRoles.includes('admin')) {
        context.log.warn(`ACESSO NEGADO: Utilizador ${requestingUser?.userDetails} tentou adicionar um utilizador sem permissão de admin.`);
        context.res = { status: 403, body: "Acesso negado. Apenas administradores podem adicionar utilizadores." };
        return;
    }

    try {
        const newUser = req.body;

        if (!newUser || !newUser.email || !newUser.name) {
            context.res = { status: 400, body: "Nome e e-mail são obrigatórios." };
            return;
        }

        const userProfile = {
            id: newUser.email.toLowerCase(),
            email: newUser.email.toLowerCase(),
            name: newUser.name,
            picture: '', // A foto será atualizada no primeiro login do utilizador
            isAdmin: newUser.isAdmin === true
        };

        await usersContainer.items.create(userProfile);
        context.log(`Administrador ${requestingUser.userDetails} adicionou o novo utilizador: ${userProfile.email}`);
        
        context.res = { body: userProfile };

    } catch (error) {
        if (error.code === 409) { // Conflito, o utilizador já existe
            context.log.warn(`Tentativa de adicionar um utilizador que já existe: ${error.message}`);
            context.res = { status: 409, body: "Este utilizador já existe na base de dados." };
        } else {
            context.log.error(`Erro ao adicionar utilizador: ${error.message}`);
            context.res = { status: 500, body: "Erro ao adicionar o utilizador." };
        }
    }
};