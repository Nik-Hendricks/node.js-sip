
function SetTheme(theme){
    var dark = () => {
        document.body.style.backgroundColor = '#262626';
        document.documentElement.style.setProperty('--mdc-theme-primary', '#38ada9');
        document.documentElement.style.setProperty('--mdc-theme-secondary', '#079992');
        document.documentElement.style.setProperty('--mdc-theme-background', '#121212');
        document.documentElement.style.setProperty('--mdc-theme-surface', '#1e1e1e');
        document.documentElement.style.setProperty('--mdc-theme-on-primary', '#fff');
        document.documentElement.style.setProperty('--mdc-theme-on-secondary', '#fff');
        document.documentElement.style.setProperty('--mdc-theme-text-primary', 'white')
    }

    var light = () => {
        document.body.style.backgroundColor = '#fff';

    }

    if(theme == 'dark'){
        dark();
    }else if(theme == 'light'){
        light();
    }
}

function TableElement(){
    var e = document.createElement('div');
    var container = document.createElement('div');
    var table = document.createElement('table');

    e.setAttribute('class', 'mdc-data-table');
    container.setAttribute('class', 'mdc-data-table__table-container');
    table.setAttribute('class', 'mdc-data-table__table');

    container.appendChild(table);
    e.appendChild(container);
    e.__ROOT__ = table;
    return e;
}

function TableHeader(cols, props){
    props = props || {};
    var e = TableHeaderElement({checkbox: props.checkbox});
    var row = e.__ROOT__;
    for(var i = 0; i < cols.length; i++){
        var cell = TableHeaderCell(cols[i], props);
        row.appendChild(cell);
    }
    return e;
}

function TableHeaderElement(props){
    props = props || {};
    var e = document.createElement('thead');
    var row = document.createElement('tr');
    row.setAttribute('class', 'mdc-data-table__header-row');
    if(props.checkbox){
        var cell = TableCheckBoxCell();
        row.appendChild(cell);
    }
    e.appendChild(row);
    e.__ROOT__ = row;
    return e;
}

function TableRow(id, props){
    props = props || {};
    var e = document.createElement('tr');
    e.setAttribute('data-row-id', `u${id}`);
    e.setAttribute('class', `mdc-data-table__row mdc-data-table__row${(props.selected) ? '--selected' : ''}`);
    if(props.checkbox){
        var cell = TableCheckBoxCell();
        e.appendChild(cell);
    }
    return e;
}

function TableCell(text, props){
    props = props || {};
    var e = document.createElement('td');
    e.setAttribute('class', `mdc-data-table__cell ${(props.number) ? "mdc-data-table__cell--numeric" : ""}`);
    e.innerHTML = text;
    return e;
}

function TableHeaderCell(text, props){
    props = props || {};
    var e = document.createElement('th');
    e.setAttribute('class', `mdc-data-table__header-cell ${(props.number) ? "mdc-data-table__header-cell--numeric" : ""}`);
    e.setAttribute('role', 'columnheader');
    e.setAttribute('scope', 'col');
    e.innerHTML = text;
    return e;
}

function TableCheckBoxCell(){
    var e = document.createElement('td');
    e.setAttribute('class', `mdc-data-table__cell mdc-data-table__cell--checkbox`);
    e.innerHTML = `<div class="mdc-checkbox mdc-data-table__row-checkbox">
                        <input type="checkbox" class="mdc-checkbox__native-control"/>
                            <div class="mdc-checkbox__background">
                                <svg class="mdc-checkbox__checkmark" viewBox="0 0 24 24">
                                <path class="mdc-checkbox__checkmark-path" fill="none" d="M1.73,12.91 8.1,19.28 22.79,4.59"/>
                                </svg>
                                <div class="mdc-checkbox__mixedmark"></div>
                            </div>
                        <div class="mdc-checkbox__ripple"></div>
                    </div>`;
    return e;
}

function Table(props){
    props = props || {};
    var table = TableElement();
    var header = TableHeader(props.cols, {checkbox: props.checkbox});

    for (var prop in props.style) {
        table.style[prop] = props.style[prop];
    }


    table.__ROOT__.appendChild(header);
    for(var i = 0; i < props.rows.length; i++){
        var row = TableRow(i, {selected:false, checkbox: props.checkbox});
        for(var j = 0; j < props.rows[i].length; j++){
            var cell = TableCell(props.rows[i][j], {number: (j == 2)});
            row.appendChild(cell);
        }
        table.__ROOT__.appendChild(row);
    }

    Object.entries(table.getElementsByTagName('td')).forEach((e) => {
        e[1].style.color = 'var(--mdc-theme-text-primary)'
    })

    Object.entries(table.getElementsByTagName('th')).forEach((e) => {
        e[1].style.color = 'var(--mdc-theme-text-primary)'
    })
    
    console.log(table)

    return table;
}


function Header(props){
    props = props || {};
    var e = document.createElement('header');
    var div = document.createElement('div');

    e.setAttribute('class', 'mdc-top-app-bar mdc-top-app-bar--dense mdc-component');
    div.setAttribute('class', 'mdc-top-app-bar__row');

    div.innerHTML = `<section class="mdc-top-app-bar__section mdc-top-app-bar__section--align-start">
                        <button class="mdc-icon-button material-icons mdc-top-app-bar__navigation-icon--unbounded">menu</button>
                        <span class="mdc-top-app-bar__title">${props.title}</span>
                    </section>
                    <section class="mdc-top-app-bar__section mdc-top-app-bar__section--align-end header-buttons">
                    </section>`;

    var btn_container = div.getElementsByClassName('header-buttons')[0];
    for(var i = 0; i < props.buttons.length; i++){
        var btn = document.createElement('button');
        btn.setAttribute('class', 'mdc-icon-button material-icons mdc-top-app-bar__action-item mdc-top-app-bar__action-item--unbounded');
        btn.innerHTML = props.buttons[i].icon;
        btn.addEventListener('click', props.buttons[i].onClick);
        btn_container.appendChild(btn);
    }
    

    e.appendChild(div);
    return new mdc.topAppBar.MDCTopAppBar(e);
}

function Dialog(props){
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

    dialog_surface.innerHTML = `<h2 class="mdc-dialog__title">${props.title}</h2>`
    dialog_surface.append(dialog_actions)

    for(var i = 0; i < props.buttons.length; i++){
        dialog_actions.innerHTML += `   <button type="button" class="mdc-button mdc-dialog__button" data-mdc-dialog-action="discard">
                                          <div class="mdc-button__ripple"></div>
                                          <span class="mdc-button__label">${props.buttons[i].text}</span>
                                        </button>`
    }

    dialog_container.appendChild(dialog_surface);
    e.appendChild(dialog_container, dialog_scrim);
    return new mdc.dialog.MDCDialog(e);
    
}


function MainContent(){
    var e = document.createElement('div')
    e.style.width = '100%'
    e.style.position = 'absolute'
    e.style.top = '48px'
    e.style.left = '0px'
    e.style.bottom = '0px'
    return e;
}