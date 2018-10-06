var ba = require('beeradvocate-api');
var GoogleSpreadsheet = require('google-spreadsheet');
var fs = require('fs');
var async = require('async');

var fs = require('fs');
var natural = require('natural');
var TfIdf = natural.TfIdf;


var doc = new GoogleSpreadsheet('1rK_Rb2gBoe-UEbCBGdNVHgmyWXjh1tK6lxgBajm-aoY');
var urls = [];

var creds = require('./g_creds.json');

async.waterfall([
    (step) => {
        doc.useServiceAccountAuth(creds, step);
    },
    (step) => {
        doc.getInfo((err, info) => {
            console.log('Loaded doc: ' + info.title + ' by ' + info.author.email);
            sheet = info.worksheets[0];
            console.log('sheet 1: ' + sheet.title + ' ' + sheet.rowCount + 'x' + sheet.colCount);
            step(null, sheet);
        });
    },
    (sheet, step) => {
        sheet.getRows({
            offset: 1
        }, (err, rows) => {
            for (var i = 0; i < rows.length; i++) {
                urls[i] = rows[i].page.substring(28);
                rows[i].save();
            }
            step(null, rows);
        });
    },
    (rows, step) => {
        var results = [];
        var saved = 0;
        var getBeer = () => {
            ba.beerPage(urls[saved], (beer) => {
                results.push(JSON.parse(beer));
                console.log(results[saved][0].beer_name);
                //rows[saved].beername = results[saved][0].beer_name;
                //rows[saved].brewery = results[saved][0].brewery_name;
                //rows[saved].typeofbeer = results[saved][0].beer_style
                rows[saved].save(() => {
                    if (saved == rows.length - 1) {
                        step(null, rows, results);
                    } else {
                        saved++;
                        getBeer();
                    }
                });
            });   
        }
        getBeer();
    },
    (rows, results, step) => {
        var saved = 0;
        var tfIdf = new TfIdf();
        var getReviews = () => {
            var fileName = results[saved][0].brewery_name + '_' + results[saved][0].beer_name
            fileName = fileName.replace(/[\s\/\?]/g, '');
            if (!fs.existsSync('./words/' + fileName)) {
                ba.beerReviews(urls[saved], (reviews) => {
                    var word_salad = [];
                    reviews.forEach((review,index) => {
                        word_salad = word_salad.concat(review.split(/[\s+]+/));
                        for (var i = word_salad.length - 1; i >= 0; i--) {
                            if (word_salad[i] == '') {
                                word_salad.splice(i, 1);
                            }
                        }
                    });
                    console.log(fileName);
                    var file = fs.createWriteStream('./words/' + fileName);
                    file.write(word_salad.join(',') + '\n');
                    file.on('error', (err) => {
                        console.error('Error reading file: ', err);
                    });
                    file.end(() => {
                        tfIdf.addFileSync('./words/' + fileName);
                        if (saved == rows.length - 1) {
                            step(null, rows, tfIdf);
                        } else {
                            saved++;
                            getReviews();
                        }
                    });
                });
            } else {
                console.log(fileName);
                tfIdf.addFileSync('./words/' + fileName);
                if (saved == rows.length - 1) {
                    step(null, rows, tfIdf);
                } else {
                    saved++;
                    getReviews();
                }
            }
        }
        getReviews();
    },
    (rows, tfIdf, step) => {
        var saved = 0;
        var getFlavorNotes = () => {
            var flavornotes = "";
            console.log("words for: " + tfIdf.documents[saved].__key);
            tfIdf.listTerms(saved).some((item, index) => {
                console.log(index+1 + ": " + item.term + ", " + item.tfidf);
                flavornotes += item.term;
                if (index <= 1) {
                    flavornotes += ', ';
                }
                return index >= 2;
            });
            rows[saved].flavornotes = flavornotes;
            rows[saved].save(() => {
                if (saved == rows.length - 1) {
                } else {
                    saved++;
                    getFlavorNotes();
                }
            });
        }
        getFlavorNotes();
    }
]); 
