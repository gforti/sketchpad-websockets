var adjectives = require('./adjectives')
var nouns = require('./nouns')
var verbs = require('./verbs')

function coinFlip() {
    return (Math.floor(Math.random() * 2) == 0);
}

function generateDraws() {

    for (let i = 0; i < 6; i++ ){
        let randAdv = Math.floor(Math.random() * adjectives.length)
        let randNoun1 = Math.floor(Math.random() * nouns.length)
        let randNoun2 = Math.floor(Math.random() * nouns.length)
        let randVerb = Math.floor(Math.random() * verbs.length)

        if ( coinFlip() ) {
            console.log(`Draw ${adjectives[randAdv]} ${nouns[randNoun1]}`)
        } else {
            console.log(`Draw a ${nouns[randNoun2]} that is going to ${verbs[randVerb]}`)
        }
        
    }
}

generateDraws()