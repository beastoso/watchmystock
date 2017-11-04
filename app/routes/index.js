'use strict';

var path = process.cwd();
var StockLibrary = require(path + '/app/controllers/stockController.server.js');

module.exports = function (app) {


	app.route('/')
		.get(function (req, res) {
			res.sendFile(path + '/public/index.html');
		});

	app.route('/api/current')
		.get(function(req, res){
			StockLibrary.getCurrentStocks(function(err, list) {
				if (err) return res.json(err);
				else res.json(list);
			});
		});
		
	app.route('/api/current/:symbol')
		.post(function(req, res){
			var symbol = req.params.symbol;
			StockLibrary.addStock(symbol, function(err, status) {
				if (err) return res.json(err);
				else res.json(true);
			});
		})
		.delete(function(req, res){
			var symbol = req.params.symbol;
			StockLibrary.removeStock(symbol, function(err, status) {
				if (err) return res.json(err);
				else res.json(true);
			});
		});

	app.route('/api/stocklist')
		.get(function (req, res) {
			StockLibrary.getStockList(function(err, list){
				if (err) return res.json(err);
				else res.json(list);
			});
		});

	app.route('/api/stockhistory')
		.get(function(req, res){
			StockLibrary.getHistoryForCurrentStocks(function(err, data) {
				if (err) return res.json(err);
				else {
					res.json(data);
				}
			});
		});
};
