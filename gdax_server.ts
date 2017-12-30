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
let projectedMean = 0.0;
let ticker = 0;
// let bigChunk = 750000;
let bigChunk = 62500;
let iterSpeed = 6250;
let projectionMultiplier = 1;

GTT.Factories.GDAX.FeedFactory(logger, products).then((feed: GDAXFeed) => {
    feed.on('data', (msg: OrderbookMessage) => {
        if ((msg as any).productId && (msg as any).type && msg.type === 'ticker') {

            let myVol = parseFloat(msg.origin.last_size);

            if (!isNaN(myVol)) {
            	// console.log(myVol)
            	vol += myVol
                trades = trades.concat([parseFloat(msg.origin.price)]);
                var myPrice = parseFloat(msg.origin.price)
                var arr = [];
                for (var i = 0; i < myVol*100; i++) {
                    arr.push(myPrice);
                }
                lastTrades = lastTrades.concat(arr);
                ticker+=arr.length;
                // console.log(lastTrades.length);
                if (initPrice == 0.0) {
                   initPrice = parseFloat(msg.origin.price);
                }
            }

        }
        // console.log(vol, trades);
        if (ticker > iterSpeed && vol != lastVol) {
            lastVol = vol;
        	increment++;
            ticker = 0;
            var action = ((projectedMean - parseFloat(msg.origin.price))/math.std(lastTrades))*10;
            if (!isNaN(action) && projectedMean > 0.0) {
                // if (!((dollars - action < 0) || litecoins + (action / parseFloat(msg.origin.price)))) {
                dollars -= action;
                litecoins += (action / parseFloat(msg.origin.price))
                totalFees += math.abs(.003*action);
            }
            console.log(`Last: ${msg.origin.price}, Mean: ${math.mean(lastTrades).toFixed(2)}, Projected Mean: ${projectedMean}, Std Dev: ${math.std(lastTrades).toFixed(2)}, Trade to make (+buy, -sell): $ ${action}, Txn fee: ${math.abs(.003*action)}`)
        	console.log(`Total txns: ${(vol).toFixed(0)}, Mean: ${math.mean(trades).toFixed(2)}, Std Dev: ${math.std(trades).toFixed(2)}, Median: ${math.median(trades).toFixed(2)}, Spread: ${(math.max(trades)-math.min(trades)).toFixed(2)} , Spread % (range/min): ${((100*(math.max(trades)-math.min(trades)))/math.min(trades)).toFixed(2)}%`)
            console.log(`Bank: $ ${dollars}, ltc ${litecoins}, total USD: $ ${dollars + litecoins*initPrice}, total fees: $ ${totalFees}`)
            if (lastTrades.length > bigChunk) {
                var runningMeans = makeMeans(lastTrades, iterSpeed);
                var mb = findLineByLeastSquares(runningMeans);
                projectedMean = estimateMean(mb[0], lastTrades.length+(iterSpeed*projectionMultiplier), mb[1])
                lastTrades.splice(0, iterSpeed);
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

function stdDev(arr) {
    var avg = math.mean(arr);
      
    var squareDiffs = arr.map(function(value){
        var diff = value - avg;
        var sqrDiff = diff * diff;
        return sqrDiff;
    });
  
    var avgSquareDiff = average(squareDiffs);

    var stdDev2 = Math.sqrt(avgSquareDiff);
    return stdDev2;
}

function makeMeans(arr, len) {
    var runningMeans = [];
    if (arr.length > len) {
        for (var i = len; i < arr.length; i++) {
            runningMeans.push(math.mean(arr.slice(i-len, i)));
        }
    }
    return runningMeans;
}

function findLineByLeastSquares(values_y) {
    var values_x = [];
    for (var i = 1; i < values_y.length+1; i++) {
        values_x.push(i);
    }
    var sum_x = 0;
    var sum_y = 0;
    var sum_xy = 0;
    var sum_xx = 0;
    var count = 0;

    /*
     * We'll use those variables for faster read/write access.
     */
    var x = 0;
    var y = 0;
    var values_length = values_x.length;

    if (values_length != values_y.length) {
        throw new Error('The parameters values_x and values_y need to have same size!');
    }

    /*
     * Nothing to do.
     */
    if (values_length === 0) {
        return [ [], [] ];
    }

    /*
     * Calculate the sum for each of the parts necessary.
     */
    for (var v = 0; v < values_length; v++) {
        x = values_x[v];
        y = values_y[v];
        sum_x += x;
        sum_y += y;
        sum_xx += x*x;
        sum_xy += x*y;
        count++;
    }

    /*
     * Calculate m and b for the formular:
     * y = x * m + b
     */
    var m = (count*sum_xy - sum_x*sum_y) / (count*sum_xx - sum_x*sum_x);
    var b = (sum_y/count) - (m*sum_x)/count;

    return [m, b];
}

function estimateMean(m, x, b) {
    return (m*x) + b
}