//should just offer a way to send a SIP message with the appropriate branch id for the dialog.
//should also offer a way to receive SIP messages and parse them into the appropriate dialog.

//on the implementation side, we should then be able to create a dialog and then register event handlers for the different SIP messages that we expect to receive.
const Builder = require("./Builder");
const Parser = require("./Parser");
const SIPMessage = require("./SIPMessage");

class Dialog{
    constructor(message){
        return new Promise(resolve => {
            this.message = message;
            this.callId = message.GetCallId();
            this.branchId = Parser.getBranch(this.message.message);
            this.events = {};
            this.message.context.dialogs[this.branchId] = this;
            //send intial request to server through main SIP class socket.

            resolve(this)
        })
    }

    on(event, callback){
        this.events[event] = callback;
    }

    send(message){
        console.log("_______Sending Message_______")
        console.log(message)
        //WILL TAKE THE "message" param and put the appropriate branch id on it.
        this.message.context.send(message);
    }

    kill(){
        delete this.message.context.dialogs[this.branchId];
        //here add logic to detect dialog type and send appropriate message to server.

    }
}

module.exports = Dialog;