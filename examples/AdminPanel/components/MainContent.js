

class MainContent{
    constructor(props){
        props = props || {};
        this.items = props.items;
        return this.render();
    }

    render(){
        var e = document.createElement('div');
        e.style.width = '100%'
        e.style.position = 'absolute'
        e.style.top = '48px'
        e.style.left = '0px'
        e.style.bottom = '0px'
        return e;
    }
}

export default MainContent