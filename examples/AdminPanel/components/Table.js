class Table{
    constructor(props){
        props = props || {};
        this.rows = props.rows;
        this.cols = props.cols;
        this.checkbox = props.checkbox;
        this.style = props.style;
        return this.render();
    }

    render(){
        var table = this.TableElement();
        var header = this.TableHeader(this.cols, {checkbox: this.checkbox});
    
        for (var prop in this.style) {
            table.style[prop] = this.style[prop];
        }
    
    
        table.__ROOT__.appendChild(header);
        for(var i = 0; i < this.rows.length; i++){
            var row = this.TableRow(i, {selected:false, checkbox: this.checkbox});
            for(var j = 0; j < this.rows[i].length; j++){
                var cell = this.TableCell(this.rows[i][j], {number: (j == 2)});
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

    TableElement(){
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

    TableHeader(cols, props){
        props = props || {};
        var e = this.TableHeaderElement({checkbox: props.checkbox});
        var row = e.__ROOT__;
        for(var i = 0; i < cols.length; i++){
            var cell = this.TableHeaderCell(cols[i], props);
            row.appendChild(cell);
        }
        return e;
    }

    TableHeaderElement(props){
        props = props || {};
        var e = document.createElement('thead');
        var row = document.createElement('tr');
        row.setAttribute('class', 'mdc-data-table__header-row');
        if(props.checkbox){
            var cell = this.TableCheckBoxCell();
            row.appendChild(cell);
        }
        e.appendChild(row);
        e.__ROOT__ = row;
        return e;
    }

    TableRow(id, props){
        props = props || {};
        var e = document.createElement('tr');
        e.setAttribute('data-row-id', `u${id}`);
        e.setAttribute('class', `mdc-data-table__row mdc-data-table__row${(props.selected) ? '--selected' : ''}`);
        if(props.checkbox){
            var cell = this.TableCheckBoxCell();
            e.appendChild(cell);
        }
        return e;
    }

    TableCell(text, props){
        props = props || {};
        var e = document.createElement('td');
        e.setAttribute('class', `mdc-data-table__cell ${(props.number) ? "mdc-data-table__cell--numeric" : ""}`);
        e.innerHTML = text;
        return e;
    }
    

    TableHeaderCell(text, props){
        props = props || {};
        var e = document.createElement('th');
        e.setAttribute('class', `mdc-data-table__header-cell ${(props.number) ? "mdc-data-table__header-cell--numeric" : ""}`);
        e.setAttribute('role', 'columnheader');
        e.setAttribute('scope', 'col');
        e.innerHTML = text;
        return e;
    }

    TableCheckBoxCell(){
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
}

export default Table