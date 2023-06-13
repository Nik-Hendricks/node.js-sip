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

    }
}

module.exports = Transaction;
