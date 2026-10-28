const crypto = require('crypto');

const Auth = {
    md5: (value) => crypto.createHash('md5').update(String(value)).digest('hex'),

    ha1: (username, realm, password) => Auth.md5(`${username}:${realm}:${password}`),

    ha2: (method, uri) => Auth.md5(`${method}:${uri}`),

    verifyDigest(props){
        props = props || {};
        if(!props.username || !props.realm || !props.nonce || !props.response || !props.method || !props.uri){
            return false;
        }
        if(props.algorithm && String(props.algorithm).toLowerCase() !== 'md5'){
            return false;
        }
        const password = props.password;
        if(password === undefined || password === null){
            return false;
        }
        try {
            const first = Auth.ha1(props.username, props.realm, password);
            const second = Auth.ha2(props.method, props.uri);
            let expected;
            if(props.qop){
                const nc = props.nc || '00000001';
                const cnonce = props.cnonce || '';
                expected = Auth.md5(`${first}:${props.nonce}:${nc}:${cnonce}:${props.qop}:${second}`);
            } else {
                expected = Auth.md5(`${first}:${props.nonce}:${second}`);
            }
            return String(expected).toLowerCase() === String(props.response).toLowerCase();
        } catch (e) {
            return false;
        }
    }
};

module.exports = Auth;
