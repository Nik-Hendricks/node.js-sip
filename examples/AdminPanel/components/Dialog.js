class Dialog{
    constructor(props){
        props = props || {};
        this.title = props.title;
        this.buttons = props.buttons || [];
        return this.render();
    }

    render(){
        var e = document.createElement('div');
        var dialog_container = document.createElement('div');
        var dialog_surface = document.createElement('div');
        var dialog_actions = document.createElement('div');
        var dialog_scrim = document.createElement('div');
    
        e.setAttribute('class', 'mdc-dialog');
        dialog_container.setAttribute('role', 'alertdialog');
        dialog_container.setAttribute('aria-modal', 'true');
        dialog_container.setAttribute('aria-labelledby', 'my-dialog-title');
        dialog_surface.setAttribute('tabindex', '-1');
    
        dialog_container.setAttribute('class', 'mdc-dialog__container');
        dialog_surface.setAttribute('class', 'mdc-dialog__surface');
        dialog_actions.setAttribute('class', 'mdc-dialog__actions');
        dialog_scrim.setAttribute('class', 'mdc-dialog__scrim');
    
        dialog_surface.innerHTML = `<h2 class="mdc-dialog__title">${this.title}</h2>`
        dialog_surface.append(dialog_actions)
    
        for(var i = 0; i < this.buttons.length; i++){
            dialog_actions.innerHTML += `   <button type="button" class="mdc-button mdc-dialog__button" data-mdc-dialog-action="discard">
                                              <div class="mdc-button__ripple"></div>
                                              <span class="mdc-button__label">${this.buttons[i].text}</span>
                                            </button>`
        }
    
        dialog_container.appendChild(dialog_surface);
        e.appendChild(dialog_container, dialog_scrim);
        return new mdc.dialog.MDCDialog(e);
    }
}

export default Dialog