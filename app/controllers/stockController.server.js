'use strict';

var DB = require('../common/db-functions.js');
var listFile = process.cwd()+'/public/resources/stocklist.json';
var fs = require('fs');
var request = require('request-promise');
require('bluebird');

var configAuth = require('../config/auth');
var historyLimit = 52;

var self = module.exports = {
    getCurrentStocks: function(callback) {
        DB.getCurrentStocks(function(err, data) {
            if (err) return callback(err);
            if (data && data.length > 0) {
                var results = [];
                data.forEach(function(item) {
                    results.push({'symbol':item._doc.symbol,'name':item._doc.name});
                });
                callback(null, results);
            }
            else {
                callback("no stocks selected");
            }
        });
    },
    addStock: function(symbol, callback) {
        self.getStockList(function(stock) {
            var found = false;
            stock.forEach(function(company){
                if (company[0] == symbol) {
                    found = company;
                }
            });
            if (found) {
                DB.addStock(found[0], found[1], callback);
            }
            else {
                callback('Could not add stock to current list');
            }
        });
    },
    removeStock: function(symbol, callback) {
        DB.removeStock(symbol, callback);
    },
    getStockList: function(callback) {
        fs.readFile(listFile, 'utf8', function(err, data){
            if (err) return callback(err);
            else {
                var list = JSON.parse(data);
                callback(list);
            }
        });
    },
    extractHistoryElements: function(data) {
        var errorNodeKey = "Error Message";
        var metaNodeKey = "Meta Data";
        var symbolKey = "2. Symbol";
        var dataNodeKey = "Weekly Time Series";
        var priceKey = "4. close";
        var formattedResults = [];
        
        if (data[errorNodeKey]) {
            return formattedResults;
        }
        
        var symbol = data[metaNodeKey][symbolKey];
            
        if (data && data[dataNodeKey] && Object.keys(data[dataNodeKey]).length > 0) {
            var results = data[dataNodeKey];
            var n = 0;
            Object.keys(results).forEach(function(week){
                var data = results[week];
                if (n < historyLimit) {
                    formattedResults.push({
                        'symbol':symbol,
                        'date':week,
                        'price':data[priceKey]
                    });
                    n++;
                }
                else {
                    return false;
                }
            });
        }
        return formattedResults;
    },
    getStockHistory: function(symbol) {
        var url = configAuth.stockAuth.apiurl;
        var key = configAuth.stockAuth.apikey;
        url += "/query?function=TIME_SERIES_WEEKLY&symbol="+symbol+"&apikey="+key;
        return request({uri: url, json:true}).promise();
    },
    getHistoryForCurrentStocks: function(callback) {
        self.getCurrentStocks(function(err, current) {
            if (err) return callback(err);
            
            if (current.length == 0) return callback(null,[]);
            
            var formatOutput = function(fetchErr, data) {
                if (fetchErr) return callback(fetchErr);
                
                var i, j, row, formattedOutput = {
                    'currentStocks': current,
                    'graphData': []
                    
                }, 
                titles = ['Week'],
                values = [];
                
                for (i = 0; i < data.length; i++) {
                    var stockhistory = data[i];
                    for (j = 0; j < historyLimit; j++) {
                        if (j == 0) {
                            titles.push(stockhistory[j].symbol);
                        }
                        if (i == 0) {
                            row = [];
                            row.push(stockhistory[j].date);
                            values.push(row);
                        }
                        else {
                            row = values[j];
                        }
                        if (j >= stockhistory.length) {
                            row.push(0);
                        } else {
                            row.push(stockhistory[j].price);
                        }
                    }
                }
                
                var completeResults = [titles];
                formattedOutput.graphData = completeResults.concat(values);
                callback(null, formattedOutput);
            };
            
            self.getHistoryParallel(current, formatOutput);
        });
    },
    getHistoryParallel: function(stockList, callback) {
        var promises = [];
        for (var n = 0; n < stockList.length; n++) {
            var symbol = stockList[n].symbol;
            promises.push(self.getStockHistory(symbol));
        }
        Promise.all(promises).catch(callback).then(function(data) {
            var histories = [];
            for (var n = 0; n < data.length; n++) {
                histories.push(self.extractHistoryElements(data[n]));
            }
            callback(null, histories);
        });
    }
    
}