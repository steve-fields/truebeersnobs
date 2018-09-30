var ba = require('beeradvocate-api');
var GoogleSpreadsheet = require('google-spreadsheet');
var fs = require('fs');
var natural = require('natural');
var TfIdf = natural.TfIdf;
var tfIdf = new TfIdf();

var doc = new GoogleSpreadsheet('1rK_Rb2gBoe-UEbCBGdNVHgmyWXjh1tK6lxgBajm-aoY');
var sheet;
var urls = [];

var creds = require('./g_creds.json');

console.log("hello");

doc.useServiceAccountAuth(creds, () => {
    doc.getInfo((err, info) => {
		console.log(info);
		console.log('Loaded doc: '+info.title+' by '+info.author.email);
		sheet = info.worksheets[0];
		console.log('sheet 1: '+sheet.title+' '+sheet.rowCount+'x'+sheet.colCount);
		sheet.getRows({
			offset: 1
		}, (err, rows) => {
			for (var i = 0; i < rows.length; i++) {
				urls[i] = rows[i].page.substring(28);
			}
			var ticker = 0;
			function getBeer() {
				ba.beerPage(urls[ticker], (beer) => {
					var result = JSON.parse(beer);
					rows[ticker].beername = result[0].beer_name;
					rows[ticker].brewery = result[0].brewery_name;
					rows[ticker].typeofbeer = result[0].beer_style;
					var word_salad = [];
					result[0].written_reviews.forEach((review, index) => {
					word_salad = word_salad.concat(review.split(/[\s+]+/));
					for (var i = word_salad.length - 1; i >= 0; i--) {
						if (word_salad[i] == '') {
							word_salad.splice(i,1);
						}
					}
					});
					var fileName = result[0].brewery_name + '_' + result[0].beer_name + '.txt';
					var fileName = fileName.replace(/[\s\/\?]/g, '');
					console.log(fileName);
					var file = fs.createWriteStream('words/' + fileName);
					file.on('error', (err) => {
						console.log('Error reading file: ', err);
					});
					
					file.write(word_salad.join(',') + '\n');
					
					file.end();
					rows[ticker].save();
					ticker++;
					if (ticker < rows.length) {
						getBeer();
					}
				});
			}
			getBeer();
		});
    });
}).then(() => {
	console.log("test");
});	


	    
