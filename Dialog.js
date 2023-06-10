//should just offer a way to send a SIP message with the appropriate branch id for the dialog.
//should also offer a way to receive SIP messages and parse them into the appropriate dialog.

//on the implementation side, we should then be able to create a dialog and then register event handlers for the different SIP messages that we expect to receive.
const Builder = require("./Builder");
const Parser = require("./Parser");

class Dialog{
    constructor(props){
        return new Promise(resolve => {
            this.context = props.context;
            this.initialRequest = (typeof props.initialRequest == "string") ? Parser.parse(props.initialRequest) : props.initialRequest;
            this.branchId;
            if(typeof this.initialRequest == "object" && typeof this.context == "object"){
                this.start().then(res => {
                    resolve(this);
                })
            }else{
                resolve({error: "Dialog must be initialized with a context and an initial request."})
            }
        })
    }

    on(event, callback){
        //here we will match the request with the dialog and then call the appropriate function.
        this.context.Socket.on('message', (message) => {
            message = message.toString();
            var parsedMessage = Parser.parse(message);
            if((Parser.getBranch(message) == this.branchId) && Parser.getResponseType(message) == event){
                callback(parsedMessage);
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
            this.branchId = Parser.getBranch(this.initialRequest);
            this.context.dialogs[this.branchId] = this;
            //send intial request to server through main SIP class socket.
            this.context.send(Builder.Build(this.initialRequest));
            resolve(this)
        })
    }

    kill(){
        delete this.context.dialogs[this.branchId];
        //here add logic to detect dialog type and send appropriate message to server.

    }
}

module.exports = Dialog;