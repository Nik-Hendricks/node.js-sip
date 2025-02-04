class SubscriptionManager{
    constructor(){
        this.subscriptions = {};
    }

    new_subscription(props){
        this.subscriptions[props.call_id] = new Subscription(props);
        return this.subscriptions[props.call_id];
    }
}
