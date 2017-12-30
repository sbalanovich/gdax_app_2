const GTT = require('gdax-trading-toolkit');

const logger = GTT.utils.ConsoleLoggerFactory();
const products = ['LTC-USD'];
GTT.Factories.GDAX.FeedFactory(logger, products).then(function (feed) {
	console.log(feed);
});