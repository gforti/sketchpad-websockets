var adjectives = require('./adjectives')
var nouns = require('./nouns')
var verbs = require('./verbs')


function generateDraws() {

    for (let i = 0; i < 6; i++ ){
        let randAdv = Math.floor(Math.random() * adjectives.length)
        let randNoun1 = Math.floor(Math.random() * nouns.length)
        let randNoun2 = Math.floor(Math.random() * nouns.length)
        let randVerb = Math.floor(Math.random() * verbs.length)

        console.log(`Draw ${adjectives[randAdv]} ${nouns[randNoun1]} and ${nouns[randNoun2]} that is going to ${verbs[randVerb]}`)
    }
}

generateDraws()