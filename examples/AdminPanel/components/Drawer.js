

class Drawer extends HTMLElement{
    constructor(props){
        super()
        props = props || {};
        this.items = props.items;
        this.open = props.open || false;
        return this;
    }

    connectedCallback(){
        var e = document.createElement('aside');
        var div = document.createElement('div');
        var nav = document.createElement('nav');
    
        e.setAttribute('class', `mdc-drawer mdc-drawer--modal ${this.open ? 'mdc-drawer--open' : ''}`);
        div.setAttribute('class', 'mdc-drawer__content');
        nav.setAttribute('class', 'mdc-deprecated-list');
    
        nav.innerHTML = `<a class="mdc-deprecated-list-item mdc-deprecated-list-item--activated" href="#" aria-current="page" tabindex="0">
                            <span class="mdc-deprecated-list-item__ripple"></span>
                            <i class="material-icons mdc-deprecated-list-item__graphic" aria-hidden="true">inbox</i>
                            <span class="mdc-deprecated-list-item__text">Inbox</span>
                        </a>
                        <a class="mdc-deprecated-list-item" href="#">
                            <span class="mdc-deprecated-list-item__ripple"></span>
                            <i class="material-icons mdc-deprecated-list-item__graphic" aria-hidden="true">send</i>
                            <span class="mdc-deprecated-list-item__text">Outgoing</span>
                        </a>`
    
        div.append(nav);
        e.append(div);
    
        Object.entries(nav.getElementsByTagName('span')).forEach((e) => {
            e[1].style.color = 'var(--mdc-theme-text-primary)'
        })
    
        Object.entries(nav.getElementsByTagName('i')).forEach((e) => {
            e[1].style.color = 'var(--mdc-theme-text-primary)'
        })
    
        this.appendChild(e);
    }

    exit_listener(e){
        if(e.target != this && e.target != this.getElementsByTagName('aside')[0] && e.target != this.getElementsByTagName('div')[0] && e.target != this.getElementsByTagName('nav')[0] || e.target == this.getElementsByTagName('header')[0].getElementsByTagName('button')[0]){
            this.Close();
            window.removeEventListener('click', this.listener)
        }
    }

    Open(){
        this.getElementsByTagName('aside')[0].classList.add('mdc-drawer--open');
        this.open = true;
        this.listener = this.exit_listener.bind(this);

        window.addEventListener('click', this.listener)
    }

    Close(){
        this.getElementsByTagName('aside')[0].classList.remove('mdc-drawer--open');
        this.open = false;
    }
}
window.customElements.define('mdc-drawer', Drawer);

export default Drawer