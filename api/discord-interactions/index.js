const { InteractionType, InteractionResponseType, verifyKey } = require('discord-interactions');

function getRequestRawBody(req) {
    if (req.rawBody && req.rawBody.length > 0) return req.rawBody;
    return JSON.stringify(req.body);
}

module.exports = async function (context, req) {
    // Verificação de segurança
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];
    const rawBody = getRequestRawBody(req);
    const publicKey = process.env.DISCORD_PUBLIC_KEY;

    const isValidRequest = verifyKey(rawBody, signature, timestamp, publicKey);
    if (!isValidRequest) {
        context.res = { status: 401, body: 'Assinatura inválida.' };
        return;
    }

    const interaction = req.body;

    // Responder ao PING de verificação do Discord
    if (interaction.type === InteractionType.PING) {
        context.res = {
            headers: { 'Content-Type': 'application/json' },
            body: { type: InteractionResponseType.PONG }
        };
        return;
    }

    // Processar um comando
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
        const commandName = interaction.data.name;

        // **PASSO 1: ADIAR A RESPOSTA IMEDIATAMENTE**
        context.res = {
            headers: { 'Content-Type': 'application/json' },
            body: { type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE }
        };

        // **PASSO 2: PREPARAR A RESPOSTA FINAL**
        let responseContent = 'Ocorreu um erro.';

        if (commandName === 'ping') {
            responseContent = 'Pong! A resposta adiada está a funcionar!';
        }

        // **PASSO 3: ENVIAR A RESPOSTA FINAL EDITANDO A MENSAGEM ADIADA**
        const followUpUrl = `https://discord.com/api/v10/webhooks/${process.env.DISCORD_APP_ID}/${interaction.token}/messages/@original`;
        
        try {
            await fetch(followUpUrl, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: responseContent }),
            });
        } catch (error) {
            context.log.error('Erro ao enviar a resposta final:', error);
        }
    }
};