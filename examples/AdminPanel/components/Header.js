

class Header{
    constructor(props){
        props = props || {};
        this.items = props.items;
        this.title = props.title;
        this.buttons = props.buttons;
        return this.render();
    }

    render(){
        var e = document.createElement('header');
        var div = document.createElement('div');
    
        e.setAttribute('class', 'mdc-top-app-bar mdc-top-app-bar--dense mdc-component');
        div.setAttribute('class', 'mdc-top-app-bar__row');
    
        div.innerHTML = `<section class="mdc-top-app-bar__section mdc-top-app-bar__section--align-start">
                            <button class="mdc-icon-button material-icons mdc-top-app-bar__navigation-icon--unbounded">menu</button>
                            <span class="mdc-top-app-bar__title">${this.title}</span>
                        </section>
                        <section class="mdc-top-app-bar__section mdc-top-app-bar__section--align-end header-buttons">
                        </section>`;
    
        var btn_container = div.getElementsByClassName('header-buttons')[0];
        for(var i = 0; i < this.buttons.length; i++){
            var btn = document.createElement('button');
            btn.setAttribute('class', 'mdc-icon-button material-icons mdc-top-app-bar__action-item mdc-top-app-bar__action-item--unbounded');
            btn.innerHTML = this.buttons[i].icon;
            btn.addEventListener('click', this.buttons[i].onClick);
            btn_container.appendChild(btn);
        }
        
        div.getElementsByTagName('button')[0].onclick = (() => {
            var d = document.getElementsByTagName('mdc-drawer')[0]
            window.app.Drawer.Open();
        })
    
        e.appendChild(div);
        return new mdc.topAppBar.MDCTopAppBar(e);
    }
}

export default Header