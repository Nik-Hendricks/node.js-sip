class Logger{
    constructor(){
        this.errors = [];
        this.info = [];
    }

    log(text){
        this.info[new Date.now()] = text;
    }

    error(text){
        this.error[new Date.now()] = text;
    }
}

module.exports = Logger