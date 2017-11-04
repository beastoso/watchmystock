'use strict';

var Stock = require('../models/stock');

var self = module.exports = {
  getCurrentStocks: function(callback) {
    Stock.find().sort({'position':1}).exec(function(err, stocks) {
      if (err) return callback(err);
      callback(null, stocks);
    });
    
  },
  addStock: function(symbol, name, callback) {
      self.getCurrentStocks(function(err, stocks) {
          if (err) return callback(err);
          
          var found = false;
          var maxPosition = 0;
          stocks.forEach(function(stock){
              if (stock.symbol == symbol) {
                  found = stock;
              }
              if (stock.position > maxPosition) {
                  maxPosition = stock.position;
              }
          });
          
          if (found) {
              return callback(null, found);
          }
          
          var stock = new Stock(
            {'position':Number(maxPosition+1), 'name':name,'symbol':symbol}
          );
          stock.save(function(err) {
            if (err) return callback(err, null);
            callback(null, stock);
          });
      });
      
  },
  
  removeStock: function(symbol, callback) {
      Stock.find({'symbol':symbol}).remove(function(err, data) {
          if (err) return callback(err);
          
          callback(null, true);
      });
  }
    
};