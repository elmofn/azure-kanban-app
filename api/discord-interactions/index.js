const { InteractionType, InteractionResponseType, verifyKey } = require('discord-interactions');

function getRequestRawBody(req) {
    if (req.rawBody && req.rawBody.length > 0) return req.rawBody;
    return JSON.stringify(req.body);
}

module.exports = async function (context, req) {
    const publicKey = process.env.DISCORD_PUBLIC_KEY;

    // **NOVO CÓDIGO DE DIAGNÓSTICO**
    // Vamos verificar se a chave foi carregada do ambiente do Azure.
    context.log(`A verificar a DISCORD_PUBLIC_KEY...`);
    if (publicKey) {
        context.log(`-> Chave Pública carregada com sucesso.`);
    } else {
        context.log.error(`-> ERRO: A variável de ambiente DISCORD_PUBLIC_KEY está em falta ou vazia no Azure!`);
        // Se a chave não existir, paramos aqui para evitar mais erros.
        context.res = { status: 500, body: 'Erro de configuração interna do bot.' };
        return;
    }

    // Verificação de segurança
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];
    const rawBody = getRequestRawBody(req);

    const isValidRequest = verifyKey(rawBody, signature, timestamp, publicKey);
    if (!isValidRequest) {
        context.log.warn('Assinatura inválida.');
        context.res = { status: 401, body: 'Assinatura inválida.' };
        return;
    }

    const interaction = req.body;

    // Responder ao PING de verificação
    if (interaction.type === InteractionType.PING) {
        context.log('Assinatura válida. A responder ao PING com PONG.');
        context.res = {
            headers: { 'Content-Type': 'application/json' },
            body: { type: InteractionResponseType.PONG }
        };
        return;
    }
    
    // (O resto do código para comandos futuros continua igual...)
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
        context.res = {
            headers: { 'Content-Type': 'application/json' },
            body: { type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE }
        };
        // ... Lógica dos comandos ...
    }
};