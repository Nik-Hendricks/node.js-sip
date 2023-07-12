import API from './api.js'
import Drawer from '../components/Drawer.js'
import MainContent from '../components/MainContent.js'
import Header from '../components/Header.js'
import Table from '../components/Table.js'
import Dialog from '../components/Dialog.js'


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

class App{
    constructor(){
        this.Header = new Header({
            title:'Users',
            buttons:[
                {
                    icon:'add',
                    text:'Add',
                    onclick:function(){
                        console.log('add')
                    }
                },
                {
                    icon:'delete',
                    text:'Delete',
                    onclick:function(){
                        console.log('delete')
                    }
                },
                {
                    icon:'edit',
                    text:'Edit',
                    onclick:function(){
                        console.log('edit')
                    }
                },
            ]
        }).root
        
        this.Drawer = new Drawer()
        this.MainContent = new MainContent()

        this.Views = {
            Users: {
                table: new Table({
                    checkbox: true,
                    cols:['Username','IP','Port','Extension','Status'],
                    rows:[
                        ['user1','192.168.1.1', '5060', '1001', 'Online'],
                        ['user2','192.168.1.1', '5060', '1002', 'Online'],
                        ['user3','192.168.1.1', '5060', '1001', 'Online'],
                        ['user4','192.168.1.1', '5060', '1002', 'Online'],
                        ['user5','192.168.1.1', '5060', '1001', 'Online'],
                        ['user6','192.168.1.1', '5060', '1002', 'Online'],
                        ['user7','192.168.1.1', '5060', '1001', 'Online'],
                        ['user8','192.168.1.1', '5060', '1002', 'Online'],
                        ['user9','192.168.1.1', '5060', '1001', 'Online'],
                        ['user10','192.168.1.1', '5060', '1002', 'Online'],
                    ]
                })
            },
        }
    }

    render(view){
        document.body.style.margin = '0px'
        this.MainContent.innerHTML = ''
        document.body.innerHTML = ''
        this.MainContent.append(this.Views[view].table)
        document.body.append(this.Header, this.Drawer, this.MainContent)
        SetTheme('dark')
        return this
    }

    

}


var app = new App().render('Users')
console.log(app)
document.addEventListener('DOMContentLoaded', function() {
    document.body.append(new Dialog().root)
    app.Drawer.Open()

});
