class FixNat{
    constructor(){
        this.routing_table = {}
    }

    AddRoute(old_address, new_address){
        this.routing_table[old_address] = new_address; 
    }

    GetRoute(old_address){
        return (typeof this.routing_table[old_address] !== 'undefined') ? this.routing_table[old_address] : old_address;
    }
}

module.exports = FixNat