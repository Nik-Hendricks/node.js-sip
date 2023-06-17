class Transaction{
    constructor(context, message){
        this.context = context;
        this.message = message;
        this.method;
        this.branchId;
    }

    send(message){

    }

    on(event, callback){
        //have all matching logic here.
        //if its a part of a dialog, then send it to the dialog.
        

        //apparently transaction handle responses to requests.
        //and dialogs handle requests to responses.
        //so we need to check if the message is a response or a request.

        //if its a response, then we need to check if its a part of a dialog.
        //if its a request, then we need to check if its a part of a dialog.

        this.context.Socket.on('message', (message) => {
            console.log(message)
            message = message.toString();
            var sipMessage = this.context.Message(message);
            if((sipMessage.branchId == this.branchId) && Parser.getResponseType(message) == event){
                var sipMessage = this.context.Message(parsedMessage);
                callback(sipMessage);
            };
        })

    }
}

module.exports = Transaction;
