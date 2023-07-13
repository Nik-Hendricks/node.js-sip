const API = {
    get_sip_users(){
        console.log('get sip user')
        return new Promise(resolve => {
            fetch('/api/sip/users').then(response => {
                resolve(response.json())
            })
        })
    }
}

export default API