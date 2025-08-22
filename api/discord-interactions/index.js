const { InteractionType, InteractionResponseType, verifyKey } = require('discord-interactions');

// O Azure Functions v4 analisa o corpo do pedido (body) automaticamente.
// Para a verificação da assinatura funcionar, precisamos do corpo como texto simples.
// O `req.rawBody` deveria funcionar, mas por vezes não é fiável.
// Vamos usar o `req.body` e convertê-lo de volta para uma string JSON consistente.
function getRequestRawBody(req) {
    // Se o rawBody existir e tiver conteúdo, use-o (melhor opção)
    if (req.rawBody && req.rawBody.length > 0) {
        return req.rawBody;
    }
    // Se não, converta o corpo JSON analisado de volta para uma string.
    // É crucial que a string seja exatamente como o Discord a enviou.
    return JSON.stringify(req.body);
}

module.exports = async function (context, req) {
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];
    const rawBody = getRequestRawBody(req);
    const publicKey = process.env.DISCORD_PUBLIC_KEY;

    if (!publicKey || !signature || !timestamp) {
        context.log.warn('Cabeçalhos de verificação em falta.');
        context.res = { status: 400, body: 'Cabeçalhos de verificação em falta.' };
        return;
    }

    try {
        const isValidRequest = verifyKey(rawBody, signature, timestamp, publicKey);

        if (!isValidRequest) {
            context.log.warn('Assinatura inválida. Acesso negado.');
            // O Discord espera um 401 para falhas de autorização.
            context.res = { status: 401, body: 'Assinatura inválida.' };
            return;
        }

        const interaction = req.body;

        if (interaction.type === InteractionType.PING) {
            context.log('É um PING. A responder com PONG.');
            context.res = {
                // A resposta para um PING tem de ser enviada diretamente no corpo (body).
                headers: { 'Content-Type': 'application/json' },
                body: { type: InteractionResponseType.PONG }
            };
            return;
        }

        // Se for um comando, damos uma resposta temporária.
        if (interaction.type === InteractionType.APPLICATION_COMMAND) {
            context.log(`Comando '${interaction.data.name}' recebido.`);
            context.res = {
                headers: { 'Content-Type': 'application/json' },
                body: {
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: { content: 'O comando foi recebido!' },
                }
            };
            return;
        }

    } catch (err) {
        context.log.error('Ocorreu um erro inesperado durante a verificação:', err);
        context.res = { status: 500, body: 'Erro interno no servidor.' };
    }
};