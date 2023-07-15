//should just offer a way to send a SIP message with the appropriate branch id for the dialog.
//should also offer a way to receive SIP messages and parse them into the appropriate dialog.

//on the implementation side, we should then be able to create a dialog and then register event handlers for the different SIP messages that we expect to receive.
const Builder = require("./Builder");
const Parser = require("./Parser");
const SIPMessage = require("./SIPMessage");

class Dialog{
    constructor(context, message){
        return new Promise(resolve => {
            this.message = message;
            this.messages = []
            this.branchId = this.message.branchId
            this.tag = this.message.tag;
            this.events = {};
            context.push_to_dialog_stack(this);
            resolve(this)
        })
    }

    on(event, callback){
        this.events[event] = callback;
    }
}

module.exports = Dialog;