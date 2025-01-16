class UserManager {
    constructor() {
        this.users = {};
    }

    addUser(props) {
        this.users[props.username] = this.User(props);
    }

    removeUser(username) {
        delete this.users[name];
    }

    User(props){
        let ret = {
            name: props.name,
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