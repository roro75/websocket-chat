/**
  Le Serveur HTTP.
  URL : http://[adresse IP/nom de domaine]:8888/

  Ce serveur produit une réponse HTTP contenant un document
  HTML suite à une requête HTTP provenant d'un client HTTP.
**/

// Chargement du module HTTP.
const http = require('http');

// Création du serveur HTTP.
var httpServer = http.createServer();
var MongoClient = require('mongodb').MongoClient;
var colors = require('colors');
var sanitizeHtml = require('sanitize-html');

var url = require('url');
var mongo = require('mongodb');
var URL = 'mongodb://localhost:27017/websocket';
var maDb;

var mime = {
    css: 'text/css',
    js: 'text/javascript',
    html: 'text/html; charset=utf-8'
};
// Fonction qui produit la réponse HTTP.
var writeResponse = function writeHTTPResponse(HTTPResponse, responseCode, responseBody) {
    HTTPResponse.writeHead(responseCode, {
        'Content-type': mime,
        'Content-length': responseBody.length
    });
    HTTPResponse.write(responseBody, function() {
        HTTPResponse.end();
    });
};

// Fonction qui produit une réponse HTTP contenant un message d'erreur 404 si le document HTML n'est pas trouvé.
var send404NotFound = function(HTTPResponse) {
    writeResponse(HTTPResponse, 404, '<doctype html!><html><head>Page Not Found</head><body><h1>404: Page Not Found</h1><p>The requested URL could not be found</p></body></html>');
};

/**
  Gestion de l'évènement 'request' : correspond à la gestion
  de la requête HTTP initiale permettant d'obtenir le fichier
  HTML contenant le code JavaScript utilisant l'API WebSocket.
**/
httpServer.on('request', function(HTTPRequest, HTTPResponse) {
    //console.log('HTTPRequest', HTTPRequest);
    var parsedURL = url.parse(HTTPRequest.url, true).query;
    //console.log(parsedURL);
    //console.log('Événement \'request\'.');
    var fs = require('fs');
    // Le fichier HTML que nous utiliserons dans tous les cas.
    var filename = 'index.html';

    fs.access(filename, fs.R_OK, function(error) {

        if(error) {
            send404NotFound(HTTPResponse);
        } else {
            fs.readFile(filename, function(error, fileData) {
                if(error) {
                    send404NotFound(HTTPResponse);
                } else {
                    var collection = maDb.collection('messages');

                    collection.find().toArray(function(err, data) {
                        console.log(data);
                        var dataFromCollectionToString = JSON.stringify(data);
                        // no VAR ici !!
                     fileData = fileData.toString().replace(/{{ data }}/gi, dataFromCollectionToString);

                        writeResponse(HTTPResponse, 200, fileData);

                    });





                }
            });
        }
    });
});

/**
  Le Serveur WebSocket associé au serveur HTTP.
  URL : ws://[adresse IP/nom de domaine]:8888/

  Ce serveur accepte une requête HTTP upgrade et établit
  une connexion persistante basée sur WebSocket.
**/

/**
  On installe et on utilise le package websocket.
  La documentation est ici : https://www.npmjs.com/package/websocket
**/
var webSocket = require('websocket');

// On récupère une référence à la classe WebSocketServer.
var WebSocketServer = webSocket.server;
/**
  La classe WebSocketServer est documentée ici :
  https://github.com/theturtle32/WebSocket-Node/blob/master/docs/WebSocketServer.md
**/

// On instancie la classe avec pour argument un référence à notre serveur HTTP.
var webSocketServer = new WebSocketServer({
    httpServer: httpServer
});

/**
  Gestion de l'évènement 'request' : correspond à la gestion
  d'une requête WebSocket provenant d'un client WebSocket.


**/

var globalConnection = [];
var webSocketConnection;
webSocketServer.on('request', function(webSocketRequest) {

    webSocketRequest;

    var acceptedProtocol = 'diwjs';
    var allowedOrigin = webSocketRequest.origin;

    webSocketConnection = webSocketRequest.accept(acceptedProtocol, allowedOrigin);

    globalConnection.push(webSocketConnection);

    //console.log(globalConnection);

    webSocketConnection.on('message', function(data) {


        var datasFromBrowserAsString = data.utf8Data;
        //console.log('données provenant du navigateur sous forme de chaine de caractere', datasFromBrowserAsString);

        var datasFromBrowser = JSON.parse(datasFromBrowserAsString);
        var datasFromServerAsString = JSON.stringify(datasFromBrowser);

        // var cleanCode = sanitizeHtml(datasFromBrowser);

        // Envoi d'un message au client WebSocket.
        for(var i = 0; i < globalConnection.length; i++) {
            globalConnection[i].sendUTF(datasFromServerAsString);
        }


        var collection = maDb.collection('messages');

        console.log(datasFromBrowser.author);
        datasFromBrowser.author = sanitizeHtml(datasFromBrowser.author);
        datasFromBrowser.message = sanitizeHtml(datasFromBrowser.message);

        collection.insert({

            author: datasFromBrowser.author,
            message: datasFromBrowser.message,
            date: datasFromBrowser.date,
            time: datasFromBrowser.time,
            getTime: datasFromBrowser.getTime

        }, function(err, result) {
            if(err) {
                //res.redirect('404');
                send404NotFound();
            } else {
                //    res.redirect(dataBase);
                console.log(result);
            }
        });



    });

});
MongoClient.connect(URL, function(err, db) {
    //console.log(db);
    maDb = db;
    if(err) {
        console.log(colors.bold.bgRed('connection db failed !!!'));
        return;
    }
    httpServer.listen(8888, function() {

        console.log(colors.bold.bgGreen('serveur OK :  2-Websocket : Exercice3'));
    });
});
// httpServer.listen(8888, function() {
//     console.log(colors.bgGreen.bold('serveur OK :  2-Websocket : Exercice3'));
// });
