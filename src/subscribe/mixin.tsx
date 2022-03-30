import { Connection } from "@solana/web3.js";

type Callback = (object: any) => void;

type Subscription = {
	id: number,
	callback: Callback,
}

let Master: any = {}

Master.addEventSubscription = function(event: string, callback: Callback ) {
	if (!this.eventSubscriptions[event])
		this.eventSubscriptions[event] = []
	this.eventSubscriptions[event].push({
		id: ++this.eventSubscriptionId,
		callback: callback
	})
	return this.eventSubscriptionId
}

Master.removeEventSubscription = function(event: string, subscriptionId: number) {
	this.eventSubscriptions[event] = this.eventSubscriptions[event].filter((sub: Subscription) => sub.id != subscriptionId);
}

Master.onCreate = function (data: any) {
	this.eventSubscriptions = {}
	this.eventSubscriptionId = 0
}

Master.onEvent = function (event: string, data: any) {
	if (!this.eventSubscriptions[event])
		return;
	for (let handler of this.eventSubscriptions[event]) {
		handler.callback(this)
	}
}

export { Master }