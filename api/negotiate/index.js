module.exports = async function (context, req) {
    context.log('HTTP trigger for SignalR negotiation.');
    
    // As informações de conexão são passadas automaticamente pelo binding
    // definido no function.json. A resposta é simplesmente o que a Azure nos dá.
    context.res = {
        body: context.bindings.connectionInfo
    };
};