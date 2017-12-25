// Setup basic express server
var express = require('express')
var app = express()
var path = require('path')
var server = require('http').createServer(app)
var io = require('socket.io')(server)
var port = process.env.PORT || 3000
const host_ip = require('./host-ip')
var gameUrl = `http://${host_ip}:${port}`

var adjectives = require('./adjectives')
var nouns = require('./nouns')
var verbs = require('./verbs')

var questions = []
var curQuestion = 0;
var totalQuestions = 0;

var nextQuestionDelayMs = 5000 //5000; //5secs // how long are players 'warned' next question is coming
var timeToAnswerMs = 60000; // 70secs // how long players have to answer question
var timeToVoteMs = 15000; // 15secs // how long players have to answer question
var timeToEnjoyAnswerMs = 10000; //10secs // how long players have to read answer

var answerData;
var answerDetails;
var players = {};

var gameInProgress = false
var questionPhase = 1

var hostId, player1, player2

var draws = []
var whatToDraw
var currentDraws = 0
var maxDraws = 0
var playerDraws = []

server.listen(port, function () {
  console.log('Game url', gameUrl);
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));


function coinFlip() {
    return (Math.floor(Math.random() * 2) == 0);
}


function generateDraws() {

    draws = []
    var len = Object.keys(players).length
    for (let i = 0; i < len; i++ ){
        let randAdv = Math.floor(Math.random() * adjectives.length)
        let randNoun1 = Math.floor(Math.random() * nouns.length)
        let randNoun2 = Math.floor(Math.random() * nouns.length)
        let randVerb = Math.floor(Math.random() * verbs.length)

        if ( coinFlip() ) {
            draws.push(`Draw ${adjectives[randAdv]} ${nouns[randNoun1]}`)
        } else {
            draws.push(`Draw a ${nouns[randNoun2]} that is going to ${verbs[randVerb]}`)
        }
    }
}


io.on('connection', function (socket) {
  var addedUser = false;


  socket.on('host', function () {
      hostId = socket.id

    socket.emit('host-game-info', {
        gameUrl: gameUrl,
        numUsers: Object.keys(players).length,
        players : players,
        gameInProgress: gameInProgress
    });
  });

  socket.on('drawing', (data) => io.to(hostId).emit('drawing', {data, whatToDraw, players, player1, player2}));


  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (data) {
    if ( players[socket.id]) return;

    // we store the username in the socket session for this client

    data.votes = 0
    data.wins = 0
    data.player = 0
    data.drawReady = false
    data.voteDone = false
    data.tries = 0
    players[socket.id] = Object.assign({}, data);

    addedUser = true;
    socket.emit('login', {
        userid: socket.id,
        numUsers: Object.keys(players).length,
        gameInProgress: gameInProgress
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      numUsers: Object.keys(players).length,
      players : players
    });

    if (gameInProgress) {
        adjustForNewPlayer(socket.id)
    }

  });



    socket.on('draw timer', function () {
        if (!players[socket.id]) return
        players[socket.id].drawReady = true
        players[socket.id].voteDone = true

    });

  socket.on('votefor', function (data) {

    if (data.player === 1) {
        players[player1].votes++
    }
     if (data.player === 2) {
        players[player2].votes++
    }

});

    socket.on('start', function (data) {
        if ( Object.keys(players).length < 2 || gameInProgress ) return
        socket.broadcast.emit('game starting');
        currentDraws = 0
        generateDraws()
        resetPlayerWins()
        emitNewQuestion();
    });


  socket.on('disconnect', function () {
    if (players[socket.id]) {
     delete players[socket.id]
     adjustForDisconnectPlayer(socket.id)

      // echo globally that this client has left
      socket.broadcast.emit('user joined', {
        numUsers: Object.keys(players).length,
        players : players
      });


    }
  });



});


function adjustForNewPlayer() {
    generateDraws()
}


function adjustForDisconnectPlayer() {
    generateDraws()
}


function getNextPlayers() {

    var registredPlayers = shuffle(Object.keys(players).filter( id => players[id].tries < 1))

    console.log('registredPlayers.length', registredPlayers.length)
    if ( !registredPlayers.length ) {
        registredPlayers = shuffle(Object.keys(players).filter( id => players[id].tries < 2))
    }

    console.log('registredPlayers.length', registredPlayers.length)
    console.log('registredPlayers', registredPlayers)
    console.log('players', players)

    if ( registredPlayers.length === 1 ) {
        var playerShuffle = shuffle(Object.keys(players).filter( id => registredPlayers[0] !== id))
        var randPlayer = playerShuffle[Math.floor(Math.random() * playerShuffle.length)];
        registredPlayers.push(randPlayer);
        return shuffle(registredPlayers)
    } else {
        return [registredPlayers[0],registredPlayers[1]]
    }

}


function resetPlayerWins() {
    Object.keys(players)
                    .forEach(id => {
                        players[id].wins = 0
                        players[id].tries = 0
                    })
}


function resetPlayerNewRound() {
    gameInProgress = true
    Object.keys(players)
                    .forEach(id => {
                        players[id].votes = 0
                        players[id].player = 0
                        players[id].drawReady = false
                        players[id].voteDone = false
                    })

    var nextPlayers = getNextPlayers()
    player1 = nextPlayers[0]
    player2 = nextPlayers[1]
    players[player1].player = 1
    players[player1].tries++
    players[player2].player = 2
    players[player2].tries++
    whatToDraw = draws[currentDraws]
    currentDraws++
}

function checkQuestionTimer(time) {

    time = time || timeToAnswerMs
    setTimeout(function(){
        if ( !players[player1] || !players[player2]) {
            emitNewQuestion()
            return
        }
        var canEmitVotes = players[player1].drawReady && players[player2].drawReady
        if (canEmitVotes) {
            let q = {}
            q.endTime = new Date().getTime() + timeToVoteMs;
            q.totalTime = timeToVoteMs;
            io.to(hostId).emit('votenow', q)

            Object.keys(players).filter(key => key!==player1 && key !== player2).forEach( key => {
                 io.to(key).emit('votenow', q)
            })

            checkVoteTimer()

        } else {
            checkQuestionTimer(200)
        }
    }, time);

}


function checkVoteTimer(time) {

    time = time || timeToVoteMs
    setTimeout(function(){
        if ( !players[player1] || !players[player2]) {
            emitNewQuestion()
            return
        }
        var canCloseVotes = Object.keys(players).filter(key => key!==player1 && key !== player2).every(key =>{
            return players[key].voteDone === true
        });
        if (canCloseVotes) {

            let q = {}
            q.endTime = new Date().getTime() + timeToEnjoyAnswerMs;
            q.totalTime = timeToEnjoyAnswerMs;
            q.player1Votes = players[player1].votes
            q.player2Votes = players[player2].votes
            q.playerName1 = players[player1].username
            q.playerName2 = players[player2].username

            if ( players[player1].votes > players[player2].votes ) {
                q.playerwinner = players[player1].username
                players[player1].wins++
            }

            if ( players[player1].votes < players[player2].votes ) {
                q.playerwinner = players[player2].username
                players[player2].wins++
            }

            if ( players[player1].votes === players[player2].votes ) {
                q.playerwinner = 'Tie'
            }

            io.to(hostId).emit('rounddone', q)
            io.sockets.emit('roundupdate', players)

            setTimeout(function(){
                emitNewQuestion()
             }, timeToEnjoyAnswerMs);

        } else {
            checkVoteTimer(200)
        }
    }, time);

}


function emitNewQuestion() {

    if (currentDraws >= draws.length) {
        emitWinner()
        return
    }

    resetPlayerNewRound()

    let q = {}
    q.endTime = new Date().getTime() + timeToAnswerMs;
    q.totalTime = timeToAnswerMs;
    q.whatToDraw = whatToDraw
    q.roundsLeft = `${currentDraws}/${draws.length}`

   io.to(hostId).emit('whatToDraw', q)
   io.to(player1).emit('unlock', q)
   io.to(player2).emit('unlock', q)

   checkQuestionTimer()

}



function emitWinner() {

    // todo: get all winners or set game to give point to just first who answers
    // maybe just get a list of winners and display the winners differently

    const mostWins = Math.max.apply(Math,Object.keys(players)
                .map(key => players[key].wins))

    var winners = Object.keys(players)
                .filter(key => players[key].wins === mostWins)
                .map(key => players[key].username)
    gameInProgress = false

    io.sockets.emit('gamedone', winners)

}


function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}