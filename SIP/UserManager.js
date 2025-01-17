class UserManager {
    constructor() {
        this.users = {};
    }

    addUser(props) {
        this.users[props.extension] = this.User(props);
    }

    removeUser(extension) {
        delete this.users[extension];
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