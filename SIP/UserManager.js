class UserManager {
    constructor() {
        this.items = {};
    }

    addUser(props) {
        this.items[props.extension] = this.User(props);
    }

    removeUser(extension) {
        delete this.items[extension];
    }

    User(props){
        let ret = {
            extension: props.extension,
            ip: props.ip,
            port: props.port,
            username: props.username,
            password: props.password,
            registered: false,
        }

        return ret;
    }
}

module.exports = UserManager;