class Transaction{
    constructor(message){
        return new Promise(resolve => {
            this.context = message.context;
            this.message = message;
            this.start().then(res => {
                resolve(this);
            })
        })
    }

    send(message){
        if(typeof message == "object"){
            message = Builder.Build(message);
        }
        return new Promise(resolve => {
            this.context.send(message);
            resolve(this);
        })
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
            console.log("TRANSACTION")
            console.log(message)
            message = message.toString();
            var sipMessage = this.context.Message(message);
            if((sipMessage.branchId == this.branchId) && Parser.getResponseType(message) == event){
                var sipMessage = this.context.Message(parsedMessage);
                callback(sipMessage);
            };
        })

    }

    start(){
        return new Promise(resolve => {
            this.branchId = Parser.getBranch(this.message.message);
            this.context.dialogs[this.branchId] = this;
            //send intial request to server through main SIP class socket.
            this.context.send(this.message);
            resolve(this)
        })
    }

    kill(){
        delete this.context.dialogs[this.branchId];
        //here add logic to detect dialog type and send appropriate message to server.

    }
}

module.exports = Transaction;
