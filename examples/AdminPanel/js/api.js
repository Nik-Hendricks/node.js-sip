const API = {
    get_sip_users(){
        return new Promise(resolve => {
            fetch('/api/sip/users')
            .then(response => () => {
                resolve(response)
            })
        })
    }
}

export default API