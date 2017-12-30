import * as GTT from 'gdax-trading-toolkit';
import { GDAXFeed } from "gdax-trading-toolkit/build/src/exchanges";
import * as math from "mathjs";
// const gdaxfeed: GDAXFeed

const logger = GTT.utils.ConsoleLoggerFactory();
const products: string[] = ['LTC-USD'];
const tallies: any = {};
products.forEach((product: string) => {
    tallies[product] = {};
});

let vol = 0.0; 
let lastVol = 0.1;
let increment = 0;
let increment2 = 0;
let trades = [];
let lastTrades = [];
let dollars = 1000.0;
let litecoins = 4;
let initPrice = 0.0;
let totalFees = 0.0;
let lastPrice = NaN;
let txnSize = .01;
let ticker = 0;

GTT.Factories.GDAX.FeedFactory(logger, products).then((feed: GDAXFeed) => {
    feed.on('data', (msg: OrderbookMessage) => {
        if ((msg as any).productId && (msg as any).type && msg.type === 'ticker') {

            let myVol = parseFloat(msg.origin.last_size);

            if (!isNaN(myVol)) {
            	// console.log(myVol)
                ticker++;
            	vol += myVol
                trades = trades.concat([parseFloat(msg.origin.price)]);
                lastTrades = lastTrades.concat([parseFloat(msg.origin.price)]);
                if (initPrice == 0.0) {
                   initPrice = parseFloat(msg.origin.price);
                }
            }

        }
        // console.log(vol, trades);
        if (ticker > 30 && vol != lastVol) {
            lastVol = vol;
        	increment++;
            ticker = 0;
            var action = ((232 - parseFloat(msg.origin.price))/math.std(lastTrades))*10;
            if (!isNaN(action)) {
                // if (!((dollars - action < 0) || litecoins + (action / parseFloat(msg.origin.price)))) {
                dollars -= action;
                litecoins += (action / parseFloat(msg.origin.price))
                totalFees += math.abs(.003*action);
            }
            console.log(`Last: ${msg.origin.price}, Mean: ${math.mean(lastTrades).toFixed(2)}, Std Dev: ${math.std(lastTrades).toFixed(2)}, Trade to make (+buy, -sell): $ ${action}, Txn fee: ${math.abs(.003*action)}`)
        	console.log(`Total txns: ${(vol).toFixed(0)}, Mean: ${math.mean(trades).toFixed(2)}, Std Dev: ${math.std(trades).toFixed(2)}, Median: ${math.median(trades).toFixed(2)}, Spread: ${(math.max(trades)-math.min(trades)).toFixed(2)} , Spread % (range/min): ${((100*(math.max(trades)-math.min(trades)))/math.min(trades)).toFixed(2)}%`)
            console.log(`Bank: $ ${dollars}, ltc ${litecoins}, total USD: $ ${dollars + litecoins*initPrice}, total fees: $ ${totalFees}`)
            if (lastTrades.length > 500) {
                lastTrades.splice(0, 30)
            }
        }
    });
}).catch((err: Error) => {
    // logger.log('error', err.message);
    process.exit(1);
});

function printTallies() {
    console.log(`${count} messages received`);
    for (let p in tallies) {
        let types: string[] = Object.keys(tallies[p]).sort();
        let tally: string = types.map(t => `${t}: ${tallies[p][t]}`).join('\t');
        console.log(`${p}: ${tally}`);
    }
}
