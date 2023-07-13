

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
        this.nav = document.createElement('nav');

        e.setAttribute('class', `mdc-drawer mdc-drawer--modal mdc-drawer--open`);
        div.setAttribute('class', 'mdc-drawer__content');
        this.nav.setAttribute('class', 'mdc-deprecated-list');
    
        e.style.transition = 'transform 225ms cubic-bezier(0, 0, 0.2, 1) 0ms'

        div.append(this.nav);
        e.append(div);
    
        Object.entries(this.nav.getElementsByTagName('span')).forEach((e) => {
            e[1].style.color = 'var(--mdc-theme-text-primary)'
        })
    
        Object.entries(this.nav.getElementsByTagName('i')).forEach((e) => {
            e[1].style.color = 'var(--mdc-theme-text-primary)'
        })
    
        this.appendChild(e);
        this.Update(this.items);


    }

    Update(items){
        this.nav.innerHTML = '';
        for(var i = 0; i < items.length; i++){
            var item = document.createElement('a');
            var ripple = document.createElement('span');
            var icon = document.createElement('i');
            var text = document.createElement('span');


            ripple.setAttribute('class', 'mdc-deprecated-list-item__ripple');
            item.setAttribute('class', 'mdc-deprecated-list-item');
            icon.setAttribute('class', 'material-icons mdc-deprecated-list-item__graphic');
            text.setAttribute('class', 'mdc-deprecated-list-item__text');

            icon.innerHTML = items[i].icon;
            text.innerHTML = items[i].text;

            icon.style.color = 'var(--mdc-theme-text-primary)'
            text.style.color = 'var(--mdc-theme-text-primary)'

            item.appendChild(ripple);
            item.appendChild(icon);
            item.appendChild(text);

            item.onclick = items[i].onclick;

            item.addEventListener('click', () => {
                this.Close();
            })

            this.nav.appendChild(item);
        }

    }

    Open(){
        this.getElementsByTagName('aside')[0].style.transform = 'translateX(0px)';
        this.open = true;
        this.appendChild(this.CloseElement());
    }

    Close(){
        this.getElementsByTagName('aside')[0].style.transform = 'translateX(-100%)';
        this.open = false;
        this.removeChild(this.getElementsByClassName('close-drawer')[0]);
    }

    CloseElement(){
        var close = document.createElement('div');
        close.style.position = 'absolute'
        close.style.top = '0px'
        close.style.right = '0px'
        close.style.height = '100%'
        close.style.width = `calc(100% - 256px)`
        close.style.backgroundColor = 'rgba(0,0,0,0.5)'
        close.style.zIndex = '1000'

        close.classList.add('close-drawer')

        close.onclick = ((ev) => {
            this.Close();
        })

        return close;
    }
}
window.customElements.define('mdc-drawer', Drawer);

export default Drawer