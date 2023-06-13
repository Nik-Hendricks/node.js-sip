//should just offer a way to send a SIP message with the appropriate branch id for the dialog.
//should also offer a way to receive SIP messages and parse them into the appropriate dialog.

//on the implementation side, we should then be able to create a dialog and then register event handlers for the different SIP messages that we expect to receive.
const Builder = require("./Builder");
const Parser = require("./Parser");
const SIPMessage = require("./SIPMessage");

class Dialog{
    constructor(message){
        return new Promise(resolve => {
            this.context = message.context;
            this.message = message;
            this.callId = message.GetCallId();
            this.start().then(res => {
                resolve(this);
            })
        })
    }

    on(event, callback){
        //here we will match the request with the dialog and then call the appropriate function.
        this.context.Socket.on('message', (message) => {
            message = message.toString();
            var parsedMessage = Parser.parse(message);
            var sipMessage = this.context.Message(parsedMessage);
            if((sipMessage.branchId == this.branchId) && Parser.getResponseType(message) == event){
                var sipMessage = this.context.Message(parsedMessage);
                callback(sipMessage);
            };
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

module.exports = Dialog;