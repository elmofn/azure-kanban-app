// Carrega as variáveis de ambiente do ficheiro .env para uso local
require('dotenv').config({ path: './.env' }); 

const axios = require('axios');

const appId = process.env.DISCORD_APP_ID;
const botToken = process.env.DISCORD_BOT_TOKEN;

if (!appId || !botToken) {
    console.error('As variáveis de ambiente DISCORD_APP_ID e DISCORD_BOT_TOKEN são necessárias.');
    process.exit(1);
}

// A lista de comandos que queremos registar
const commands = [
    {
        name: 'ping',
        description: 'Responde com Pong! (para testar se o bot está online)',
    },
    // Aqui adicionaremos mais comandos no futuro, como /novatarefa
];

const url = `https://discord.com/api/v10/applications/${appId}/commands`;

console.log('A registar os comandos...');

axios.put(url, commands, {
    headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
    },
})
.then(response => {
    console.log('Comandos registados com sucesso!');
    console.log(response.data);
})
.catch(error => {
    console.error('Erro ao registar os comandos:', error.response ? error.response.data : error.message);
});