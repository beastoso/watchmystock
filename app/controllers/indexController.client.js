/*global appUrl,ajaxFunctions, google, io*/
'use strict';

var listUrl = appUrl + '/api/stocklist';
var currentUrl = appUrl + '/api/current';
var graphUrl = appUrl + '/api/stockhistory';
var webSocketConnection = false;
   
   
function getWebSocket() {
	if (!webSocketConnection) {
		webSocketConnection = io(appUrl);
		webSocketConnection.on('news', function(data) {
			var dataObj = JSON.parse(data);
			refreshStockList(dataObj)
			redrawGraph(dataObj);
		});
	}
	return webSocketConnection;
}

function showLoader() {
	var loader = document.querySelector("#loading");
	loader.removeAttribute("style");
}

function hideLoader() {
	var loader = document.querySelector("#loading");
	loader.setAttribute("style","display:none;");
}

function drawGraph() {
	showLoader();
	
	ajaxFunctions.ready(ajaxFunctions.ajaxRequest('GET', graphUrl, function (data) {
		var dataObj = JSON.parse(data);
		redrawGraph(dataObj);
	}));
}

function refreshStockList(dataObj) {
	if (dataObj.currentStocks && dataObj.currentStocks.length > 0) {
		var dummyStock = document.querySelector("#dummyStock");
		var stockContainer = document.querySelector("#currentList");
		stockContainer.innerHTML = "";
		stockContainer.appendChild(dummyStock);
		dataObj.currentStocks.forEach(function(item) {
			displayStock(item);
		});
	}
}
   
function redrawGraph(dataObj) {
	
	if (dataObj.graphData && dataObj.graphData.length > 0) {
		document.querySelector("#placeholder").setAttribute("style","display:none;");
		
		google.charts.load('current', {packages: ['corechart', 'line']});
		google.charts.setOnLoadCallback(function() {

	      var data = new google.visualization.DataTable();
	      data.addColumn('date','Week');
	      var tags = dataObj.graphData[0];
	      for (var n=1; n<tags.length; n++) {
	      	data.addColumn('number', tags[n]);
	      }
	      
	      var rows = [];
	      for(var n=1; n < dataObj.graphData.length; n++) {
	      	var row = dataObj.graphData[n];
	      	var date = row[0];
	      	var rowData = [new Date(date)];
	      	for (var m=1; m < row.length; m++) {
	      		rowData.push(Number(row[m]));
	      	}
	      	rows.push(rowData);
	      }
	      
	      data.addRows(rows);
	
	      var options = {
	        hAxis: {
	          title: 'Time'
	        },
	        vAxis: {
	          title: 'Price ($)'
	        },
	        height: 350,
	        width: 800
	      };
	
	      var chart = new google.visualization.LineChart(document.getElementById('chart_div'));
	      chart.draw(data, options);
		  
		  document.querySelector("#chart_div").removeAttribute("style");
		  
	    });
	}
	else {
		document.querySelector("#chart_div").setAttribute("style","display:none;");
		document.querySelector("#placeholder").removeAttribute("style");
	}
	
	hideLoader();
}

function addStock(item) {
	showLoader();
	displayStock(item);
	var url = currentUrl+"/"+item.symbol;
	ajaxFunctions.ready(ajaxFunctions.ajaxRequest('POST', url, function (data) {
      getWebSocket().emit('notify',JSON.stringify("added"));
   }));
}

function removeStock(symbol) {
	showLoader();
	var url = currentUrl+"/"+symbol;
	ajaxFunctions.ready(ajaxFunctions.ajaxRequest('DELETE', url, function (data) {
      getWebSocket().emit('notify', JSON.stringify("removed"));
   }));
}

function displayStock(item) {
	var newItemElem = document.querySelector("#dummyStock").cloneNode(true);
	newItemElem.removeAttribute("id");
	newItemElem.removeAttribute("style");
	newItemElem.setAttribute("data-symbol", item.symbol);
  	
	var symbolSpan = newItemElem.getElementsByClassName("symbol")[0];
	symbolSpan.textContent = item.symbol;
  	var nameSpan = newItemElem.getElementsByClassName("name")[0];
  	nameSpan.textContent = item.name;
  	
  	var removeBtn = newItemElem.getElementsByClassName("remove")[0];
  	removeBtn.addEventListener("click", function(e) {
  		e.preventDefault();
  		var elem = e.target;
  		var listItem = elem.parentElement;
  		var symbol = listItem.getAttribute("data-symbol");
  		var list = listItem.parentElement;
  		list.removeChild(listItem);
  		removeStock(symbol);
  	});
  	
  	var currentListElem = document.querySelector('#currentList');
  	currentListElem.appendChild(newItemElem);
}

function addOption(option) {
	var newItemElem = document.createElement("option");
  	newItemElem.textContent = option[0]+" - "+option[1];
  	newItemElem.setAttribute("value", option[0]);
  	var listElem = document.querySelector('#list');
   	listElem.appendChild(newItemElem);
}

(function () {

	getWebSocket();

   var addBtn = document.querySelector('#addBtn');

   ajaxFunctions.ready(ajaxFunctions.ajaxRequest('GET', listUrl, function (data) {
      var list = JSON.parse(data);
      if (list && list.length > 0) {
      	list.forEach(function(item) {
      		addOption(item);
      	});
      }
   }));
   
   ajaxFunctions.ready(ajaxFunctions.ajaxRequest('GET', currentUrl, function (data) {
      var list = JSON.parse(data);
      if (list && list.length > 0) {
      	list.forEach(function(item) {
      		displayStock(item);
      	});
      }
   }));
   
   addBtn.addEventListener("click", function(e) {
   	e.preventDefault();
   	var selectElem = document.querySelector("#list");
   	if (selectElem.selectedIndex) {
   		var option = selectElem.options[selectElem.selectedIndex];
   		var symbol = option.value;
   		if (symbol) {
   			addStock({'symbol': symbol, 'name':option.textContent});
   		}
   	}
   });
   
   drawGraph();
   
})();
