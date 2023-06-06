class Event{
    constructor (context, name = "", callback = () => {}, data = {}) {
        this.name = name;
        this.callback = callback;
        this.data = data;
    }
}

class Dialog{
    constructor(context){
        this.branchId = Math.floor(Math.random() * 10000000000000);
        this.dialog_events = [
            "Trying",
            "Ringing",
            "OK",
            "ACK",
            "BYE",
            "CANCEL",
            "INVITE",
            "REGISTER",
            "NOTIFY",
            "SUBSCRIBE",
            "INFO",
            "REFER",
            "OPTIONS",
            "MESSAGE",
            "UPDATE",
            "PRACK",
            "PUBLISH",
        ];



    }

    //READ THIS WHEN YOU GET BACK FROM CASEY'S
    //https://stackoverflow.com/questions/502366/structs-in-javascript

    //need to make a global system in the SIP class that will emit events to each dialog
    //they will then be matched to the dialog that is listening for them
    //this will allow for multiple dialogs to be created and used at the same time

    //follow the approach of advanced/verbose classes and simple builder functions

    /*

    new Dialog({
        context: context,
        type: "INVITE",
        headers: {
            "From": "sip:
            ...
        },
        body: "SDP"
    }){
        //this is the dialog object
        //it will have a method to create the dialog
        //it will have a method to send a message
        //it will have a method to receive a message
        //it will have a method to close the dialog
        //it will have a method to emit events
        //it will have a method to listen for events
        //it will have a method to add a listener for an event
        //note alot of this will come from the SIP class denoted as context
    }

    */


}

module.exports = Dialog;