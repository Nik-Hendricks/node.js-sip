const readline = require('readline');

class TUI{
    constructor(){
        this.components = {}
        this.HideCursor()
        this.loop()
    }

    AddComponent(name, component){
        this.components[name] = component;
        return this.components[name]
    }

    drawChar(x, y, char, color){
        process.stdout.write(`\x1b[${y};${x}H${char}`);  // Prints 'x' at row 1, column 10
    }

    Clear(){
        console.log('\x1Bc');
    }

    loop(){
        this.Clear();
        for(var c in this.components){
            this.components[c].update();
            for(var char of this.components[c].charbuffer){
                this.drawChar(char[0], char[1], char[2])
            }
        }
    }

    HideCursor(){
        console.log('\x1b[?25l')
    }

    Text(text, x, y){
        return new Text(this, text, x, y, text.length, 1)
    }

    Component(x, y, w, h){
        return new Component(this, x, y, w, h);
    }

}

class Component{
    constructor(engine, x, y , w, h){
        this.width = w;
        this.height = h;
        this.x = x;
        this.y = y;
        this.engine = engine;
        this.charbuffer = [];
        this.components = []

    }

    update(){
        this.charbuffer = [];
        for(var c in this.components){

            for(var char of this.components[c].charbuffer){
                this.charbuffer.push([char[0] + this.x, char[1] + this.y, char[2]])
            }
        }
    }

    Append(name, component){
        this.components[name] = component;
    }

}

class Text extends Component{
    constructor(engine, text, x, y, w, h){
        super(engine, x, y, w, h)
        this.text = text
        this.create()
        return this
    }

    create(){
        var y = this.y
        var x = this.x;
        for(var _x = 0; _x < this.text.length; _x++){
            var c = this.text[_x]
            x++
            if(c == '\n'){
                y++
                x = this.x
                
            }
            this.charbuffer.push([x, y, c])
        }
    }
}

module.exports = TUI;