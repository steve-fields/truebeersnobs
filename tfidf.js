var fs = require('fs');
var natural = require('natural');
var TfIdf = natural.TfIdf;
var tfIdf = new TfIdf();

function printEverything() {

}

try {
    var files = fs.readdirSync('./words/');
    files.forEach((file,index) => {
        tfIdf.addFileSync('./words/' + file);
    });
    var i = 0;
    for (i = 0; i < files.length; i++) {
        console.log("Terms for " + files[i]);
        tfIdf.listTerms(i).some((item, index) => {
            console.log(item.term + ': ' + item.tfidf);
            return index >= 2;
        });
    }
} catch (e) {
    console.log('error', e);
}